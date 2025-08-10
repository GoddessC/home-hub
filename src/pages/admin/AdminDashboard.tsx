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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YearlyUserPointsList } from '@/components/users/YearlyUserPointsList';
import { AddAlarmDialog, AlarmFormValues } from '@/components/alarms/AddAlarmDialog';
import { AlarmList, Alarm } from '@/components/alarms/AlarmList';
import { UserNav } from '@/components/layout/UserNav';
import { UserManagementList } from '@/components/users/UserManagementList';
import { AddUserDialog, AddUserFormValues } from '@/components/users/AddUserDialog';

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Queries
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

  const { data: alarms, isLoading: isLoadingAlarms } = useQuery<Alarm[]>({
    queryKey: ['alarms'],
    queryFn: async () => {
        const { data, error } = await supabase.from('alarms').select('*').order('time', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    }
  });

  // Mutations
  const addUserMutation = useMutation({
    mutationFn: async (newUser: AddUserFormValues) => {
      const { error } = await supabase.functions.invoke('add-user-to-household', {
        body: newUser,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showSuccess('New member added successfully!');
    },
    onError: (error) => {
      showError(`Failed to add member: ${error.message}`);
    }
  });

  const addChoreMutation = useMutation({
    mutationFn: async (newChore: ChoreFormValues) => {
      if (!profile?.household_id) throw new Error("Household not found for user.");
      const { error } = await supabase.from('chores').insert({
        ...newChore,
        household_id: profile.household_id,
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
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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

  const addAlarmMutation = useMutation({
    mutationFn: async (newAlarm: AlarmFormValues) => {
        if (!profile?.household_id) throw new Error("Household not found for user.");
        const { error } = await supabase.from('alarms').insert({
            ...newAlarm,
            household_id: profile.household_id,
        });
        if (error) throw new Error(error.message);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alarms'] });
        showSuccess('Alarm added successfully!');
    },
    onError: (error) => {
        showError(`Failed to add alarm: ${error.message}`);
    }
  });

  const updateAlarmMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Alarm> }) => {
        const { error } = await supabase.from('alarms').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alarms'] });
        showSuccess('Alarm updated.');
    },
    onError: (error) => {
        showError(`Failed to update alarm: ${error.message}`);
    }
  });

  const deleteAlarmMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await supabase.from('alarms').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alarms'] });
        showSuccess('Alarm deleted.');
    },
    onError: (error) => {
        showError(`Failed to delete alarm: ${error.message}`);
    }
  });

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
      <main className="flex-grow container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">User Management</h2>
                <AddUserDialog onAddUser={(data) => addUserMutation.mutate(data)}>
                  <Button>Add New Member</Button>
                </AddUserDialog>
              </div>
              {isLoadingProfiles ? (
                <Card>
                  <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ) : (
                <UserManagementList
                  profiles={profiles || []}
                  onDeleteUser={() => { /* TODO: Implement delete user */ }}
                  currentUserId={user!.id}
                />
              )}
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
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
                  </CardContent>
                </Card>
              ) : (
                <ChoreList 
                  chores={chores || []} 
                  onUpdateChore={(id, updates) => updateChoreMutation.mutate({ id, updates })}
                  onDeleteChore={(id) => deleteChoreMutation.mutate(id)}
                />
              )}
            </section>

            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold">Alarm Management</h2>
                    <AddAlarmDialog onAddAlarm={(data) => addAlarmMutation.mutate(data)}>
                        <Button>Add New Alarm</Button>
                    </AddAlarmDialog>
                </div>
                {isLoadingAlarms ? (
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </Content>
                    </Card>
                ) : (
                    <AlarmList
                        alarms={alarms || []}
                        onUpdateAlarm={(id, updates) => updateAlarmMutation.mutate({ id, updates })}
                        onDeleteAlarm={(id) => deleteAlarmMutation.mutate(id)}
                    />
                )}
            </section>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Leaderboard</h2>
            {isLoadingProfiles ? (
              <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ) : (
              <YearlyUserPointsList profiles={profiles || []} />
            )}
          </div>
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;