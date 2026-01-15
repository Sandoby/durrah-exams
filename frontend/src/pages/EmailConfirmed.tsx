import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function EmailConfirmed() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        // Check URL hash for confirmation status
        const hash = window.location.hash;

        if (hash.includes('type=signup') || hash.includes('type=email')) {
            setStatus('success');
            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } else if (hash.includes('error')) {
            setStatus('error');
        } else {
            // Default to success if no specific error
            setStatus('success');
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        }
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Verifying Email...
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please wait while we confirm your email address.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Email Confirmed!
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Your email has been successfully verified.
                            </p>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4">
                                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                    Redirecting to dashboard in 3 seconds...
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Go to Dashboard Now
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Verification Failed
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                We couldn't verify your email. The link may have expired or is invalid.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Back to Login
                            </button>
                        </>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        © 2026 Durrah for Tutors. All Rights Reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
