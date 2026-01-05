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
      {user && subscriptionStatus === 'payment_failed' && isBannerVisible && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-5 duration-500 max-w-md w-full">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-l-4 border-rose-500 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">Subscription Payment Failed</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Your access is restricted. Please update your payment details to continue.</p>

                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => navigate('/checkout')}
                      className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg transition-colors shadow-sm shadow-rose-200 dark:shadow-rose-900/20"
                    >
                      Update Payment
                    </button>
                    <button
                      onClick={() => setIsBannerVisible(false)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setIsBannerVisible(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
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
