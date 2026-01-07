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
import UpdatePassword from './pages/UpdatePassword';
import EmailConfirmed from './pages/EmailConfirmed';
import Checkout from './pages/Checkout';
import PaymentCallback from './pages/PaymentCallback';
import PaymentHistory from './pages/PaymentHistory';
import PaymentTest from './pages/PaymentTest';
import RefundPolicy from './pages/RefundPolicy';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PricingPage from './pages/PricingPage';

import Dashboard from './pages/Dashboard';
import ExamEditor from './pages/ExamEditor';
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
import { ExamAnalyticsDashboard } from "./components/analytics/ExamAnalyticsDashboard";

import KidsLanding from './pages/KidsLanding';
import KidsExamView from './pages/KidsExamView';
import { ProtectedRoute, AgentRoute } from './components/ProtectedRoute';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

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
  const { user, subscriptionStatus } = useAuth();
  const [isBannerVisible, setIsBannerVisible] = useState(true);

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

            // Handle custom scheme durrah://
            if (data.url.includes('durrah://')) {
              await Browser.close();
              if (url.hostname === 'payment-callback') {
                navigate('/payment-callback' + url.search + url.hash);
              }
              return;
            }

            // Handle Universal/App Links (https)
            if (url.hostname.includes('durrahsystem.tech')) {
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
      {/* Ultra-Premium Glassy Payment Failure Notification (Mobile Optimized) */}
      {user && subscriptionStatus === 'payment_failed' && isBannerVisible && (
        <div className="fixed top-4 sm:top-8 left-4 right-4 sm:left-auto sm:right-8 z-[100] animate-in slide-in-from-top-4 sm:slide-in-from-right-12 fade-in duration-1000 max-w-none sm:max-w-md w-auto sm:w-full">
          <div className="relative group">
            {/* Multi-layer ambient glow */}
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-rose-500/30 via-violet-600/20 to-indigo-500/30 rounded-[2rem] sm:rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent rounded-[2rem] sm:rounded-[2.5rem] blur-xl"></div>

            <div className="relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-[40px] border border-white/40 dark:border-slate-800/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 overflow-hidden">
              {/* Subtle glass texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>

              <div className="relative flex flex-col gap-4 sm:gap-6">
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/20 dark:to-slate-900/40 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-rose-100 dark:border-rose-500/30 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-8 sm:h-8 text-rose-600 dark:text-rose-400 drop-shadow-sm">
                      <path d="M10.73 5.07a2 2 0 0 0-3.47 0L2.27 15.09a2 2 0 0 0 1.74 2.91h12.18a2 2 0 0 0 1.74-2.91L12.47 5.07Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setIsBannerVisible(false)}
                    className="p-2 rounded-xl sm:rounded-2xl bg-black/5 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90 duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    Subscription <br className="hidden sm:block" />On Hold
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    We were unable to process your automatic renewal. Restore access to professional features now.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    onClick={() => navigate('/checkout')}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-black py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 group"
                  >
                    <div className="p-1 sm:p-1.5 bg-white/20 dark:bg-black/10 rounded-lg group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                    </div>
                    Restore Access
                  </button>
                  <button
                    onClick={() => setIsBannerVisible(false)}
                    className="w-full py-2 sm:py-4 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Remind me later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
        <Route path="/exam/new" element={<ProtectedRoute><ExamEditor /></ProtectedRoute>} />
        <Route path="/exam/:id/edit" element={<ProtectedRoute><ExamEditor /></ProtectedRoute>} />
        <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
        <Route path="/exam/:examId/analytics" element={<ProtectedRoute><ExamAnalyticsDashboard /></ProtectedRoute>} />

        {/* Student Routes (Some have internal auth logic) */}
        <Route path="/exam/:id" element={<ExamView />} />
        <Route path="/student-portal" element={<StudentPortal />} />
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
