import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">HomeHub</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Welcome, {profile?.full_name || user?.email}!
            </span>
            {profile?.role === 'admin' && (
              <Button asChild variant="secondary">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            )}
            <Button onClick={signOut} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Your Dashboard</h2>
          <p className="text-xl text-gray-600">
            This is where your family's information will be displayed.
          </p>
          {/* Panels will go here */}
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;