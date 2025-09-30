import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { RegistrationProvider } from './context/RegistrationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/NotFound';
import KioskPairingPage from './pages/KioskPairingPage';
import KioskDashboard from './pages/KioskDashboard';
import KioskCalmCorner from './pages/KioskCalmCorner';
import { AvatarBuilderPage } from './pages/AvatarBuilder';
import { StorePage } from './pages/StorePage';

const AppRoutes = () => {
  let session, loading, isAnonymous, household, member, device;
  
  try {
    const authData = useAuth();
    session = authData.session;
    loading = authData.loading;
    isAnonymous = authData.isAnonymous;
    household = authData.household;
    member = authData.member;
    device = authData.device;
  } catch (error) {
    console.error('Auth context not available:', error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl">Loading HomeHub...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl">Loading HomeHub...</p>
        </div>
      </div>
    );
  }

  // No session, public routes
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={
          <RegistrationProvider>
            <Register />
          </RegistrationProvider>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Anonymous Kiosk User
  if (isAnonymous) {
    return (
        <Routes>
            <Route path="/kiosk/pair" element={device ? <Navigate to="/kiosk" replace /> : <KioskPairingPage />} />
            <Route path="/kiosk" element={device ? <KioskDashboard /> : <Navigate to="/kiosk/pair" replace />} />
            <Route path="/kiosk/calm-corner" element={device ? <KioskCalmCorner /> : <Navigate to="/kiosk/pair" replace />} />
            <Route path="*" element={<Navigate to="/kiosk/pair" replace />} />
        </Routes>
    )
  }

  // If setup is complete, show the main app
  if (household && member) {
    return (
      <Routes>
        <Route path="/" element={<KioskDashboard />} />
        {member.role === 'OWNER' && (
          <Route path="/admin" element={<AdminDashboard />} />
        )}
        <Route path="/avatar-builder/:memberId" element={<AvatarBuilderPage />} />
        <Route path="/store/:memberId" element={<StorePage />} />
        <Route path="/kiosk/calm-corner" element={<KioskCalmCorner />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // User exists but no household/member - redirect to registration to complete setup
  return (
    <Routes>
      <Route path="/register" element={
        <RegistrationProvider>
          <Register />
        </RegistrationProvider>
      } />
      <Route path="*" element={<Navigate to="/register" replace />} />
    </Routes>
  );
};

export default AppRoutes;