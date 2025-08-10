import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddChoreDialog, ChoreFormValues } from '@/components/chores/AddChoreDialog';
import { ChoreList } from '@/components/chores/ChoreList';
import { Profile } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const AdminDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const { data: chores, isLoading: isLoadingChores } = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chores').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const addChoreMutation = useMutation({
    mutationFn: async (newChore: ChoreFormValues) => {
      const { error } = await supabase.from('chores').insert({
        ...newChore,
        due_date: newChore.due_date ? newChore.due_date.toISOString().split('T')[0] : undefined,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      showSuccess('Chore added successfully!');
    },
    onError: (error) => {
      showError(`Failed to add chore: ${error.message}`);
    }
  });

  const updateChoreMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase.from('chores').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      showSuccess('Chore updated!');
    },
    onError: (error) => {
      showError(`Failed to update chore: ${error.message}`);
    }
  });

  const deleteChoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      showSuccess('Chore deleted.');
    },
    onError: (error) => {
      showError(`Failed to delete chore: ${error.message}`);
    }
  });

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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold">Chore Management</h2>
            {profiles && (
              <AddChoreDialog profiles={profiles} onAddChore={(data) => addChoreMutation.mutate(data)}>
                <Button>Add New Chore</Button>
              </AddChoreDialog>
            )}
          </div>
          
          {isLoadingChores || isLoadingProfiles ? (
            <Card>
              <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ) : (
            <ChoreList 
              chores={chores || []} 
              onUpdateChore={(id, updates) => updateChoreMutation.mutate({ id, updates })}
              onDeleteChore={(id) => deleteChoreMutation.mutate(id)}
            />
          )}
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;