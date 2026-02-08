import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import 'katex/dist/katex.min.css';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import StudentPortal from './pages/StudentPortal';
import DemoPage from './pages/DemoPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import UpdatePassword from './pages/UpdatePassword';
import EmailConfirmed from './pages/EmailConfirmed';
import EmailVerification from './pages/EmailVerification';
import Checkout from './pages/Checkout';
import PaymentCallback from './pages/PaymentCallback';
import PaymentHistory from './pages/PaymentHistory';
import PaymentTest from './pages/PaymentTest';
import RefundPolicy from './pages/RefundPolicy';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PricingPage from './pages/PricingPage';

import Dashboard from './pages/Dashboard';
import ExamEditor from './pages/ExamEditor.tsx';
import ExamView from './pages/ExamView';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import QuestionBank from './pages/QuestionBank';
import AgentLogin from './pages/AgentLogin';
import SupportDashboard from './pages/support/SupportDashboard';
import AgentDashboard from './pages/support/AgentDashboard';
import { BlogList } from './pages/blog/BlogList';
import { BlogPost } from './pages/blog/BlogPost';
import { SubmissionSync } from './components/SubmissionSync';
import StudyZone from './pages/StudyZone';
import { ExamAnalyticsDashboard } from "./components/analytics/ExamAnalyticsDashboard";
import { ProctorDashboard } from "./components/ProctorDashboard";

import KidsLanding from './pages/KidsLanding';
import KidsExamView from './pages/KidsExamView';
import ExamResultsPage from './pages/ExamResultsPage';
import { ProtectedRoute, AgentRoute } from './components/ProtectedRoute';

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

import { Capacitor } from '@capacitor/core';
import MobileWelcome from './pages/MobileWelcome';
import { PushNotificationHandler } from './components/PushNotificationHandler';
import { LocationLanguageHandler } from './components/LocationLanguageHandler';
import { BackButtonHandler } from './components/BackButtonHandler';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';

import { useNavigate, Routes, Route } from 'react-router-dom';

import { useAuth } from './context/AuthContext';

function AppContent() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  useAuth(); // Just ensuring hook is called if needed, though likely not anymore here

  // ... existing useEffects ...

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;

    if (i18n.language === 'ar') {
      document.body.style.fontFamily = "'Cairo', sans-serif";
    } else {
      document.body.style.fontFamily = "inherit";
    }
  }, [i18n.language]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupAppUrlListener = async () => {
        CapApp.addListener('appUrlOpen', async (data: any) => {
          console.log('App opened with URL:', data.url);

          try {
            const url = new URL(data.url);

            // Handle custom scheme com.durrah.tutors://login-callback
            if (data.url.startsWith('com.durrah.tutors://login-callback')) {
              await Browser.close(); // Close the Chrome tab

              // Extract params from hash or search
              // Supabase PKCE flow typically returns code in search params
              const params = new URLSearchParams(url.search);
              const code = params.get('code');
              const error = params.get('error');

              // Supabase Implicit flow (if used) returns tokens in hash
              const hash = url.hash.substring(1);
              const hashParams = new URLSearchParams(hash);
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');

              if (error) {
                console.error('Auth error from callback:', error, params.get('error_description'));
                return;
              }

              if (code) {
                const { supabase } = await import('./lib/supabase');
                const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
                if (sessionError) {
                  console.error('Error exchanging code for session:', sessionError);
                } else {
                  console.log('Successfully exchanged code for session');
                  navigate('/dashboard');
                }
              } else if (accessToken && refreshToken) {
                const { supabase } = await import('./lib/supabase');
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
                if (sessionError) {
                  console.error('Error setting session from tokens:', sessionError);
                } else {
                  console.log('Successfully set session from tokens');
                  navigate('/dashboard');
                }
              }

              return;
            }

            // Handle legacy custom scheme durrah:// (if any)
            if (data.url.includes('durrah://')) {
              await Browser.close();
              if (url.hostname === 'payment-callback') {
                navigate('/payment-callback' + url.search + url.hash);
              }
              return;
            }

            // Handle Universal/App Links (https)
            if (url.hostname.includes('durrahsystem.tech') || url.hostname.includes('durrahtutors.com')) {
              const path = url.pathname + url.search + url.hash;
              console.log('Deep linking to path:', path);
              navigate(path);
            }
          } catch (err) {
            console.error('Error parsing deep link URL:', err);
          }
        });
      };
      setupAppUrlListener();
    }
  }, [navigate]);

  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Routes>
        <Route path="/" element={isNative ? <MobileWelcome /> : <LandingPage />} />
        <Route path="/mobile-welcome" element={<MobileWelcome />} />
        <Route path="/kids" element={<KidsLanding />} />
        <Route path="/kids/quiz/:id" element={<KidsExamView />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />
        <Route path="/verify-email" element={<EmailVerification />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
        <Route path="/exam/new" element={<ProtectedRoute><ExamEditor /></ProtectedRoute>} />
        <Route path="/exam/:id/edit" element={<ProtectedRoute><ExamEditor /></ProtectedRoute>} />
        <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
        <Route path="/exam/:examId/analytics" element={<ProtectedRoute><ExamAnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/exam/:examId/results" element={<ProtectedRoute><ExamResultsPage /></ProtectedRoute>} />
        <Route path="/exam/:examId/proctor" element={<ProtectedRoute><ProctorDashboard /></ProtectedRoute>} />

        {/* Student Routes (Some have internal auth logic) */}
        <Route path="/exam/:id" element={<ExamView />} />
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/study-zone" element={<StudyZone />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />

        {/* Support & Admin (Strictly Protected) */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/super-admin" element={<SuperAdminPanel />} />
        <Route path="/support" element={<AgentRoute><SupportDashboard /></AgentRoute>} />
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/agent-login" element={<AgentLogin />} />

        {/* Public Utility */}
        <Route path="/payment-test" element={<PaymentTest />} />
        <Route path="/payment-test" element={<PaymentTest />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PushNotificationHandler />
      <LocationLanguageHandler />
      <SubmissionSync />
      <Router>
        <BackButtonHandler />
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
