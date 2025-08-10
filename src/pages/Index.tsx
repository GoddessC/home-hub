import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex justify-between items-center p-4 bg-white shadow-md">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="flex-grow p-6 text-center">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex justify-between items-center p-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">HomeHub</h1>
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 hidden sm:inline">
              Welcome, {profile?.full_name || user.email}! (Role: {profile?.role})
            </span>
            <Button onClick={signOut}>Logout</Button>
          </div>
        )}
      </header>

      <main className="flex-grow p-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold mb-4">Dashboard</h2>
          <p className="text-lg text-gray-600">
            Your family's central command center.
          </p>
          {/* Dashboard panels will go here */}
        </div>
      </main>
      
      <MadeWithDyad />
    </div>
  );
};

export default Index;