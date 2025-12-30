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
import Checkout from './pages/Checkout';
import PaymentCallback from './pages/PaymentCallback';
import PaymentHistory from './pages/PaymentHistory';
import PaymentTest from './pages/PaymentTest';
import RefundPolicy from './pages/RefundPolicy';
import TermsOfService from './pages/TermsOfService';

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
import { ProtectedRoute, AdminRoute, AgentRoute } from './components/ProtectedRoute';

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

function AppContent() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

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
                navigate('/payment-callback' + url.search);
              }
              return;
            }

            // Handle Universal/App Links (https)
            if (url.hostname.includes('durrahsystem.tech')) {
              const path = url.pathname + url.search;
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
        <Route path="/update-password" element={<UpdatePassword />} />

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
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/super-admin" element={<AdminRoute><SuperAdminPanel /></AdminRoute>} />
        <Route path="/support" element={<AgentRoute><SupportDashboard /></AgentRoute>} />
        <Route path="/agent" element={<AgentRoute><AgentDashboard /></AgentRoute>} />
        <Route path="/agent-login" element={<AgentLogin />} />

        {/* Public Utility */}
        <Route path="/payment-test" element={<PaymentTest />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
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
