import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Checkout from './pages/Checkout';

import Dashboard from './pages/Dashboard';
import ExamEditor from './pages/ExamEditor';
import ExamView from './pages/ExamView';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import { SubmissionSync } from './components/SubmissionSync';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';

function App() {
  return (
    <AuthProvider>
      <SubmissionSync />
      <Router>
        <div className="min-h-screen bg-background text-foreground font-sans antialiased">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/exam/new" element={<ExamEditor />} />
            <Route path="/exam/:id/edit" element={<ExamEditor />} />
            <Route path="/exam/:id" element={<ExamView />} />
            <Route path="/exam/:examId/analytics" element={<AnalyticsDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
