import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChoreList } from '@/components/chores/ChoreList';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: chores, isLoading: isLoadingChores } = useQuery({
    queryKey: ['chores', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chores')
        .select('*, profiles(full_name, avatar_url)')
        .eq('assigned_to', user.id)
        .order('is_completed')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user,
  });

  const updateChoreMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase.from('chores').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', user?.id] });
      showSuccess('Chore updated!');
    },
    onError: (error) => {
      showError(`Failed to update chore: ${error.message}`);
    }
  });

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
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">My Chores</h2>
          {isLoadingChores ? (
             <Card>
              <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ) : (
            <ChoreList 
              chores={chores || []} 
              onUpdateChore={(id, updates) => updateChoreMutation.mutate({ id, updates })}
              onDeleteChore={() => { /* Non-admins can't delete */ }}
            />
          )}
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;