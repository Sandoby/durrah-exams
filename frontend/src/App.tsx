import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

import { Capacitor } from '@capacitor/core';
import MobileWelcome from './pages/MobileWelcome';
import { PushNotificationHandler } from './components/PushNotificationHandler';
import { LocationLanguageHandler } from './components/LocationLanguageHandler';
import { BackButtonHandler } from './components/BackButtonHandler';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';

function App() {
  const { i18n } = useTranslation();

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
    // Handle deep links for in-app browser returns
    if (Capacitor.isNativePlatform()) {
      const setupAppUrlListener = async () => {
        CapApp.addListener('appUrlOpen', async (data: any) => {
          console.log('App opened with URL:', data.url);
          // If the URL is our custom scheme, close the browser
          if (data.url.includes('durrah://')) {
            await Browser.close();
          }
        });
      };
      setupAppUrlListener();
    }
  }, []);

  const isNative = Capacitor.isNativePlatform();

  return (
    <AuthProvider>
      <PushNotificationHandler />
      <LocationLanguageHandler />
      <SubmissionSync />
      <Router>
        <BackButtonHandler />
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-callback" element={<PaymentCallback />} />
            <Route path="/payment-history" element={<PaymentHistory />} />
            <Route path="/payment-test" element={<PaymentTest />} />
            <Route path="/question-bank" element={<QuestionBank />} />
            <Route path="/exam/new" element={<ExamEditor />} />
            <Route path="/exam/:id/edit" element={<ExamEditor />} />
            <Route path="/exam/:id" element={<ExamView />} />
            <Route path="/student-portal" element={<StudentPortal />} />
            <Route path="/exam/:examId/analytics" element={<ExamAnalyticsDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/super-admin" element={<SuperAdminPanel />} />
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/agent-login" element={<AgentLogin />} />
            <Route path="/support" element={<SupportDashboard />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
