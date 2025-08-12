import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2 } from 'lucide-react';
import { AssignChoreDialog } from './AssignChoreDialog';
import { format } from 'date-fns';

type MemberWithProfile = {
  user_id: string;
  role: string;
  profiles: {
    full_name: string | null;
  } | null;
};

type ChoreLog = {
  id: string;
  completed_at: string | null;
  chores: {
    title: string;
    points: number;
  } | null;
};

export const ChoreManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('members')
        .select('user_id, role, profiles(full_name)')
        .eq('household_id', household.id);
      if (error) throw error;
      return data as MemberWithProfile[];
    },
    enabled: !!household?.id,
  });

  const { data: chores, isLoading: isLoadingChores } = useQuery({
    queryKey: ['chore_log', household?.id, 'today'],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('chore_log')
        .select('id, user_id, completed_at, chores(title, points)')
        .eq('household_id', household.id)
        .eq('due_date', new Date().toISOString().slice(0, 10));
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const deleteChoreMutation = useMutation({
    mutationFn: async (choreLogId: string) => {
      const { error } = await supabase.from('chore_log').delete().eq('id', choreLogId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Chore removed.');
      queryClient.invalidateQueries({ queryKey: ['chore_log'] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleAddChoreClick = (member: MemberWithProfile) => {
    setSelectedMember(member);
    setDialogOpen(true);
  };

  const getChoresForMember = (userId: string) => {
    return (chores as ChoreLog[])?.filter((chore: any) => chore.user_id === userId) || [];
  };

  if (isLoadingMembers) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chore Assignments for Today</CardTitle>
        <CardDescription>Assign and track daily chores for each household member.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {members?.map(member => (
          <div key={member.user_id}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-lg">{member.profiles?.full_name || 'Unnamed Member'}</h4>
              <Button variant="outline" size="sm" onClick={() => handleAddChoreClick(member)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Assign Chore
              </Button>
            </div>
            {isLoadingChores ? <Skeleton className="h-10 w-full" /> : (
              <ul className="space-y-2">
                {getChoresForMember(member.user_id).map(chore => (
                  <li key={chore.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg text-sm">
                    <span className={`${chore.completed_at ? 'line-through text-muted-foreground' : ''}`}>
                      {chore.chores?.title} ({chore.chores?.points} pt)
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => deleteChoreMutation.mutate(chore.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
                {getChoresForMember(member.user_id).length === 0 && (
                  <p className="text-sm text-muted-foreground">No chores assigned for today.</p>
                )}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
      {selectedMember && (
        <AssignChoreDialog
          isOpen={isDialogOpen}
          setOpen={setDialogOpen}
          member={selectedMember}
        />
      )}
    </Card>
  );
};