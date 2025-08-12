import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/NotFound';
import CreateHousehold from './pages/CreateHousehold';
import KioskPairingPage from './pages/KioskPairingPage';
import KioskDashboard from './pages/KioskDashboard';

const AppRoutes = () => {
  const { session, loading, isAnonymous, household, member, device } = useAuth();

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
        <Route path="/register" element={<Register />} />
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
            <Route path="*" element={<Navigate to="/kiosk/pair" replace />} />
        </Routes>
    )
  }

  // Authenticated Human User
  if (!household || !member) {
    return (
        <Routes>
            <Route path="/create-household" element={<CreateHousehold />} />
            <Route path="*" element={<Navigate to="/create-household" replace />} />
        </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {member.role === 'OWNER' && (
        <Route path="/admin" element={<AdminDashboard />} />
      )}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/create-household" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;