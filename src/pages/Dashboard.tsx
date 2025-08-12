import { useAuth } from '@/context/AuthContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { UserNav } from '@/components/layout/UserNav';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChoreTracker } from '@/components/dashboard/ChoreTracker';

const Dashboard = () => {
  const { user, household, member, profile } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            <Link to="/">{household?.name || 'HomeHub'}</Link>
          </h1>
          <div className="flex items-center space-x-4">
            {member?.role === 'OWNER' && (
              <Button asChild variant="secondary">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            )}
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="text-left mb-8">
            <h2 className="text-4xl font-bold">Welcome, {profile?.full_name || user?.email}</h2>
            <p className="text-gray-600 mt-2">Here's what's happening in your household today.</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <ChoreTracker />
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;