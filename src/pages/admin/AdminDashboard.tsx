import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { UserNav } from '@/components/layout/UserNav';
import { DeviceManagement } from '@/components/admin/DeviceManagement';
import { ChoreManagement } from '@/components/admin/ChoreManagement';

const AdminDashboard = () => {
  const { household } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            <Link to="/">HomeHub - Admin</Link>
          </h1>
          <div className="flex items-center space-x-4">
            <Button asChild variant="secondary">
              <Link to="/">View Dashboard</Link>
            </Button>
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <h2 className="text-3xl font-bold mb-2">Admin Panel for {household?.name}</h2>
        <p className="text-muted-foreground mb-6">Manage your household settings, devices, and chores.</p>
        
        <div className="grid grid-cols-1 gap-8">
            <DeviceManagement />
            <ChoreManagement />
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;