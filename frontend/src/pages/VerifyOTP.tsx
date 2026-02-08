import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, RefreshCw, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo } from '../components/Logo';
import { useTranslation } from 'react-i18next';

const OTP_EXPIRY_SECONDS = 15 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 3;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export default function VerifyOTP() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpTimeRemaining, setOtpTimeRemaining] = useState(OTP_EXPIRY_SECONDS);
  const [resendTimeRemaining, setResendTimeRemaining] = useState(RESEND_COOLDOWN_SECONDS);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_VERIFY_ATTEMPTS);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const email = searchParams.get('email');

  useEffect(() => {
    // Redirect if no email
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    // Countdown timers
    const interval = setInterval(() => {
      setOtpTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      setResendTimeRemaining((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Focus first input
    inputRefs.current[0]?.focus();

    return () => clearInterval(interval);
  }, [email, navigate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only last digit if multiple entered
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (
      !isVerifying &&
      attemptsRemaining > 0 &&
      otpTimeRemaining > 0 &&
      newCode.every((digit) => digit !== '') &&
      newCode.join('').length === 6
    ) {
      void verifyOTP(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: clear current or move to previous
    if (e.key === 'Backspace') {
      if (code[index]) {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Arrow keys navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Remove non-digits

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      // Auto-submit pasted code
      void verifyOTP(pastedData);
    }
  };

  const verifyOTP = async (otpCode: string) => {
    if (attemptsRemaining <= 0) {
      toast.error('Maximum attempts reached. Please request a new code.');
      setCanResend(true);
      return;
    }

    if (otpTimeRemaining <= 0) {
      toast.error(t('auth.forgotPassword.codeExpired'));
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-password-reset-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email, otpCode }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
          if (result.attemptsRemaining <= 0) {
            setCanResend(true);
          }
        }

        if (response.status === 429) {
          setAttemptsRemaining(0);
          setCanResend(true);
        }

        throw new Error(result.error || 'Invalid code');
      }

      // Store reset token temporarily
      sessionStorage.setItem('password_reset_token', result.resetToken);

      toast.success(t('auth.messages.codeVerified'));

      // Navigate to password reset page
      navigate('/update-password');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('auth.forgotPassword.invalidCode')));
      // Clear code and reset focus
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const otpCode = code.join('');

    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    void verifyOTP(otpCode);
  };

  const resendCode = async () => {
    if (!canResend || !email) {
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend code');
      }

      toast.success(t('auth.messages.codeSent'));
      setOtpTimeRemaining(typeof result.expiresIn === 'number' ? result.expiresIn : OTP_EXPIRY_SECONDS);
      setResendTimeRemaining(RESEND_COOLDOWN_SECONDS);
      setCanResend(false);
      setAttemptsRemaining(MAX_VERIFY_ATTEMPTS);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('auth.messages.resendError')));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-gray-900 dark:to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('auth.forgotPassword.codeTitle')}
        </h2>
        <div className="mt-2 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="h-4 w-4" />
            <span>{t('auth.forgotPassword.codeDesc', { email })}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 6-digit OTP input boxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
                {t('auth.forgotPassword.enterCode')}
              </label>
              <div className="flex justify-center gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[index]}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isVerifying}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Timer and attempts info */}
            <div className="flex flex-col items-center gap-2">
              {otpTimeRemaining > 0 ? (
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  <Shield className="h-4 w-4" />
                  <span>{t('auth.forgotPassword.expiresIn', { time: formatTime(otpTimeRemaining) })}</span>
                </div>
              ) : (
                <div className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t('auth.forgotPassword.codeExpired')}
                </div>
              )}

              {attemptsRemaining < MAX_VERIFY_ATTEMPTS && (
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  {t('auth.forgotPassword.attemptsRemaining', { count: attemptsRemaining })}
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Max 3 OTP requests per hour per email.
              </div>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isVerifying || otpTimeRemaining <= 0 || attemptsRemaining <= 0 || code.some((d) => d === '')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {t('auth.forgotPassword.verifying')}
                  </>
                ) : (
                  t('auth.forgotPassword.verifyCode')
                )}
              </button>
            </div>
          </form>

          {/* Resend button */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  {t('auth.forgotPassword.didntReceive')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={resendCode}
                disabled={!canResend || isResending}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResending ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {t('auth.forgotPassword.resending')}
                  </>
                ) : canResend ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('auth.forgotPassword.resendCode')}
                  </>
                ) : (
                  t('auth.forgotPassword.resendIn', { time: formatTime(resendTimeRemaining) })
                )}
              </button>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-indigo-600 hover:text-indigo-500 font-medium flex items-center justify-center mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('auth.forgotPassword.backToRequest')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
