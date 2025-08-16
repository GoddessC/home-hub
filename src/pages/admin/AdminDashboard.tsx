import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { UserNav } from '@/components/layout/UserNav';
import { DeviceManagement } from '@/components/admin/DeviceManagement';
import { MemberManagement } from '@/components/admin/MemberManagement';
import { ChoreTemplateManagement } from '@/components/admin/ChoreTemplateManagement';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { HouseholdSettings } from '@/components/admin/HouseholdSettings';
import { CalmCornerManagement } from '@/components/admin/CalmCornerManagement';
import { FeelingsManagement } from '@/components/admin/FeelingsManagement';
import { QuestManagement } from '@/components/admin/QuestManagement';
import { AlarmManagement } from '@/components/admin/AlarmManagement';
import { WeatherSettings } from '@/components/admin/WeatherSettings';

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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <AlarmManagement />
                <QuestManagement />
                <AnnouncementManagement />
                <FeelingsManagement />
                <MemberManagement />
                <DeviceManagement />
                <ChoreTemplateManagement />
            </div>
            <div className="lg:col-span-1 space-y-8">
                <HouseholdSettings />
                <WeatherSettings />
                <CalmCornerManagement />
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;