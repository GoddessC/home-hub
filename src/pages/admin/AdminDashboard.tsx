import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">HomeHub - Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Welcome, {profile?.full_name || user?.email}!
            </span>
            <Button asChild variant="secondary">
              <Link to="/">View Dashboard</Link>
            </Button>
            <Button onClick={signOut} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Admin Dashboard</h2>
          <p className="text-xl text-gray-600">
            Manage chores, alarms, announcements, and users from here.
          </p>
          {/* Admin management components will go here */}
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;