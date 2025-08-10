import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddChoreDialog, ChoreFormValues } from '@/components/chores/AddChoreDialog';
import { ChoreList, Chore } from '@/components/chores/ChoreList';
import { Member } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { YearlyMemberPointsList } from '@/components/members/YearlyMemberPointsList';
import { AddAlarmDialog, AlarmFormValues } from '@/components/alarms/AddAlarmDialog';
import { AlarmList, Alarm } from '@/components/alarms/AlarmList';
import { UserNav } from '@/components/layout/UserNav';
import { MemberManagementList } from '@/components/members/MemberManagementList';
import { AddMemberDialog, AddMemberFormValues } from '@/components/members/AddMemberDialog';
import { AnnouncementManagement, Announcement } from '@/components/announcements/AnnouncementManagement';

type UpdateChoreArgs = { id: string; updates: Partial<Chore> };
type UpdateAlarmArgs = { id: string; updates: Partial<Alarm> };
type AddAnnouncementArgs = { content: string };

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Queries
  const { data: members, isLoading: isLoadingMembers } = useQuery<Member[], Error>({
    queryKey: ['members', profile?.household_id],
    queryFn: async () => {
      if (!profile?.household_id) return [];
      const { data, error } = await supabase.from('members').select('*').eq('household_id', profile.household_id);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!profile?.household_id,
  });

  const { data: chores, isLoading: isLoadingChores } = useQuery<Chore[], Error>({
    queryKey: ['chores', profile?.household_id],
    queryFn: async () => {
      if (!profile?.household_id) return [];
      const { data, error } = await supabase.from('chores').select('*, members(full_name, avatar_url)').eq('household_id', profile.household_id).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!profile?.household_id,
  });

  const { data: alarms, isLoading: isLoadingAlarms } = useQuery<Alarm[], Error>({
    queryKey: ['alarms', profile?.household_id],
    queryFn: async () => {
        if (!profile?.household_id) return [];
        const { data, error } = await supabase.from('alarms').select('*').eq('household_id', profile.household_id).order('time', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    },
    enabled: !!profile?.household_id,
  });

  const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery<Announcement[], Error>({
    queryKey: ['announcements', profile?.household_id],
    queryFn: async () => {
      if (!profile?.household_id) return [];
      const { data, error } = await supabase.from('announcements').select('*').eq('household_id', profile.household_id).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!profile?.household_id,
  });

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: async (newMember: AddMemberFormValues) => {
      if (!profile?.household_id) throw new Error("Household not found.");
      const { error } = await supabase.from('members').insert({ ...newMember, household_id: profile.household_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', profile?.household_id] });
      showSuccess('New member added!');
    },
    onError: (error: Error) => showError(`Failed to add member: ${error.message}`),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', profile?.household_id] });
      queryClient.invalidateQueries({ queryKey: ['chores', profile?.household_id] });
      showSuccess('Member deleted.');
    },
    onError: (error: Error) => showError(`Failed to delete member: ${error.message}`),
  });

  const addChoreMutation = useMutation({
    mutationFn: async (newChore: ChoreFormValues) => {
      if (!profile?.household_id) throw new Error("Household not found.");
      const { error } = await supabase.from('chores').insert({
        ...newChore,
        household_id: profile.household_id,
        due_date: newChore.due_date ? newChore.due_date.toISOString().split('T')[0] : undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', profile?.household_id] });
      showSuccess('Chore added!');
    },
    onError: (error: Error) => showError(`Failed to add chore: ${error.message}`),
  });

  const updateChoreMutation = useMutation({
    mutationFn: async ({ id, updates }: UpdateChoreArgs) => {
      const { error } = await supabase.from('chores').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', profile?.household_id] });
      queryClient.invalidateQueries({ queryKey: ['members', profile?.household_id] });
      showSuccess('Chore updated!');
    },
    onError: (error: Error) => showError(`Failed to update chore: ${error.message}`),
  });

  const deleteChoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', profile?.household_id] });
      showSuccess('Chore deleted.');
    },
    onError: (error: Error) => showError(`Failed to delete chore: ${error.message}`),
  });

  const addAlarmMutation = useMutation({
    mutationFn: async (newAlarm: AlarmFormValues) => {
        if (!profile?.household_id) throw new Error("Household not found.");
        const { error } = await supabase.from('alarms').insert({ ...newAlarm, household_id: profile.household_id });
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alarms', profile?.household_id] });
        showSuccess('Alarm added!');
    },
    onError: (error: Error) => showError(`Failed to add alarm: ${error.message}`),
  });

  const updateAlarmMutation = useMutation({
    mutationFn: async ({ id, updates }: UpdateAlarmArgs) => {
        const { error } = await supabase.from('alarms').update(updates).eq('id', id);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alarms', profile?.household_id] });
        showSuccess('Alarm updated.');
    },
    onError: (error: Error) => showError(`Failed to update alarm: ${error.message}`),
  });

  const deleteAlarmMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await supabase.from('alarms').delete().eq('id', id);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alarms', profile?.household_id] });
        showSuccess('Alarm deleted.');
    },
    onError: (error: Error) => showError(`Failed to delete alarm: ${error.message}`),
  });

  const addAnnouncementMutation = useMutation({
    mutationFn: async (newAnnouncement: AddAnnouncementArgs) => {
      if (!profile?.household_id || !user?.id) throw new Error("User or household not found.");
      const { error } = await supabase.from('announcements').insert({
        ...newAnnouncement,
        household_id: profile.household_id,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', profile?.household_id] });
      queryClient.invalidateQueries({ queryKey: ['latestAnnouncement', profile?.household_id] });
      showSuccess('Announcement posted!');
    },
    onError: (error: Error) => showError(`Failed to post announcement: ${error.message}`),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', profile?.household_id] });
      queryClient.invalidateQueries({ queryKey: ['latestAnnouncement', profile?.household_id] });
      showSuccess('Announcement deleted.');
    },
    onError: (error: Error) => showError(`Failed to delete announcement: ${error.message}`),
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
              <Link to="/">View Family Dashboard</Link>
            </Button>
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            <section>
              <AnnouncementManagement
                announcements={announcements || []}
                onAddAnnouncement={(data) => addAnnouncementMutation.mutate(data)}
                onDeleteAnnouncement={(id) => deleteAnnouncementMutation.mutate(id)}
                isLoading={isLoadingAnnouncements}
                isSubmitting={addAnnouncementMutation.isPending}
              />
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">Member Management</h2>
                <AddMemberDialog onAddMember={(data) => addMemberMutation.mutate(data)}>
                  <Button>Add New Member</Button>
                </AddMemberDialog>
              </div>
              {isLoadingMembers ? (
                <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
              ) : (
                <MemberManagementList
                  members={members || []}
                  onDeleteMember={(memberId) => deleteMemberMutation.mutate(memberId)}
                />
              )}
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">Chore Management</h2>
                {members && (
                  <AddChoreDialog members={members} onAddChore={(data) => addChoreMutation.mutate(data)}>
                    <Button>Add New Chore</Button>
                  </AddChoreDialog>
                )}
              </div>
              {isLoadingChores || isLoadingMembers ? (
                <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
              ) : (
                <ChoreList 
                  chores={chores || []} 
                  onUpdateChore={(id, updates) => updateChoreMutation.mutate({ id, updates })}
                  onDeleteChore={(id) => deleteChoreMutation.mutate(id)}
                  title="All Household Chores"
                  showAdminControls={true}
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
                    <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
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
            {isLoadingMembers ? (
              <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
            ) : (
              <YearlyMemberPointsList members={members || []} />
            )}
          </div>
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;