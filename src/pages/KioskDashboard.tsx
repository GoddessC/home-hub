import { useAuth } from '@/context/AuthContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ChoreTracker } from '@/components/dashboard/ChoreTracker';

const KioskDashboard = () => {
  const { device, household, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {household?.name || 'Kiosk Mode'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">{device?.display_name}</span>
            <Button variant="destructive" onClick={signOut}>Exit Kiosk Mode</Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
            <ChoreTracker />
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default KioskDashboard;