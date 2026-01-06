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
      {/* Premium Payment Failure Notification */}
      {user && subscriptionStatus === 'payment_failed' && isBannerVisible && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-8 duration-700 max-w-md w-full">
          <div className="relative group overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

            <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/20 dark:border-slate-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-6">
              <div className="flex gap-5">
                {/* Visual Indicator */}
                <div className="relative shrink-0">
                  <div className="h-14 w-14 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/40 dark:to-rose-900/20 rounded-2xl flex items-center justify-center border border-rose-200/50 dark:border-rose-800/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400 animate-pulse">
                      <path d="M10.73 5.07a2 2 0 0 0-3.47 0L2.27 15.09a2 2 0 0 0 1.74 2.91h12.18a2 2 0 0 0 1.74-2.91L12.47 5.07Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Access Interrupted
                    </h3>
                    <button
                      onClick={() => setIsBannerVisible(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                    We were unable to process your subscription renewal. Please update your payment method to restore your Professional features.
                  </p>

                  <div className="mt-5 flex items-center gap-4">
                    <button
                      onClick={() => navigate('/checkout')}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                      Restore Direct Access
                    </button>
                    <button
                      onClick={() => setIsBannerVisible(false)}
                      className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 transition-colors"
                    >
                      Later
                    </button>
                  </div>
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
