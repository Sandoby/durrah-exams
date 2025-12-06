import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import DemoPage from './pages/DemoPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Checkout from './pages/Checkout';
import RefundPolicy from './pages/RefundPolicy';

import Dashboard from './pages/Dashboard';
import ExamEditor from './pages/ExamEditor';
import ExamView from './pages/ExamView';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import QuestionBank from './pages/QuestionBank';
import AgentLogin from './pages/AgentLogin';
import SupportDashboard from './pages/support/SupportDashboard';
import { SubmissionSync } from './components/SubmissionSync';
import { ExamAnalyticsDashboard } from "./components/analytics/ExamAnalyticsDashboard";

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

import { LocationLanguageHandler } from './components/LocationLanguageHandler';

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

  return (
    <AuthProvider>
      <LocationLanguageHandler />
      <SubmissionSync />
      <Router>
        <div className="min-h-screen bg-background text-foreground font-sans antialiased">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/question-bank" element={<QuestionBank />} />
            <Route path="/exam/new" element={<ExamEditor />} />
            <Route path="/exam/:id/edit" element={<ExamEditor />} />
            <Route path="/exam/:id" element={<ExamView />} />
            <Route path="/exam/:examId/analytics" element={<ExamAnalyticsDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
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
