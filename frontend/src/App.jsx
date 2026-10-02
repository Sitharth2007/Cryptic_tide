import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ParticipantDashboard from './pages/ParticipantDashboard';
import WaitingRoom from './pages/WaitingRoom';
import QuizPage from './pages/QuizPage';
import CompletionPage from './pages/CompletionPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';

function RequireAuth({ children, allowedRoles }) {
  const { session, role, loading } = useAuth();
  if (loading) return <div className="page-center"><div className="spinner" /></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center ocean-bg">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 56, height: 56 }} />
          <p style={{ marginTop: '1rem', color: 'var(--gold-bright)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            LOADING THE VOYAGE...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stars-layer" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Participant routes */}
        <Route path="/participant" element={
          <RequireAuth allowedRoles={['PARTICIPANT']}>
            <ParticipantDashboard />
          </RequireAuth>
        } />
        <Route path="/participant/waiting" element={
          <RequireAuth allowedRoles={['PARTICIPANT']}>
            <WaitingRoom />
          </RequireAuth>
        } />
        <Route path="/participant/quiz" element={
          <RequireAuth allowedRoles={['PARTICIPANT']}>
            <QuizPage />
          </RequireAuth>
        } />
        <Route path="/participant/completed" element={
          <RequireAuth allowedRoles={['PARTICIPANT']}>
            <CompletionPage />
          </RequireAuth>
        } />

        {/* Admin routes */}
        <Route path="/admin/*" element={
          <RequireAuth allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AdminDashboard />
          </RequireAuth>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
