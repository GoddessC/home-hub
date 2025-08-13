import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Member, useAuth } from '@/context/AuthContext';
import { Trash2, PlusCircle } from 'lucide-react';
import { AssignChoreDialog } from './AssignChoreDialog';

interface MemberStatsCardProps {
  member: Member;
}

export const MemberStatsCard = ({ member }: MemberStatsCardProps) => {
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const [isAssignChoreOpen, setAssignChoreOpen] = useState(false);

  const { data: weeklyScore, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ['member_weekly_score', member.id],
    queryFn: async () => {
      const weekStartsOn = (household?.chore_reset_day as (0 | 1 | 2 | 3 | 4 | 5 | 6)) ?? 0;
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn }), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('chore_log')
        .select('chores(points)')
        .eq('member_id', member.id)
        .not('completed_at', 'is', null)
        .gte('due_date', weekStart)
        .lte('due_date', weekEnd);
      if (error) throw error;
      return data.reduce((acc, item) => acc + (item.chores?.points || 0), 0);
    },
    enabled: !!member && !!household,
  });

  const { data: allTimeScore, isLoading: isLoadingAllTime } = useQuery({
    queryKey: ['member_all_time_score', member.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chore_log')
        .select('chores(points)')
        .eq('member_id', member.id)
        .not('completed_at', 'is', null);
      if (error) throw error;
      return data.reduce((acc, item) => acc + (item.chores?.points || 0), 0);
    },
    enabled: !!member,
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Member removed.');
      queryClient.invalidateQueries({ queryKey: ['members', household?.id] });
    },
    onError: (error: Error) => {
      showError(`Failed to remove member: ${error.message}`);
    }
  });

  return (
    <>
      <Card className="flex flex-col justify-between">
        <div>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>{member.full_name}</CardTitle>
                    {member.role === 'OWNER' && <CardDescription>Owner</CardDescription>}
                    {member.role === 'ADULT' && <CardDescription>Adult</CardDescription>}
                    {member.role === 'CHILD' && <CardDescription>Child</CardDescription>}
                </div>
                {member.role !== 'OWNER' && (
                    <Button variant="ghost" size="icon" onClick={() => deleteMemberMutation.mutate(member.id)} disabled={deleteMemberMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex justify-around text-center">
                <div>
                    <p className="text-2xl font-bold">{isLoadingWeekly ? <Skeleton className="h-8 w-12 mx-auto" /> : weeklyScore}</p>
                    <p className="text-xs text-muted-foreground">Points This Week</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{isLoadingAllTime ? <Skeleton className="h-8 w-12 mx-auto" /> : allTimeScore}</p>
                    <p className="text-xs text-muted-foreground">All-Time Points</p>
                </div>
            </CardContent>
        </div>
        <CardFooter>
            <Button
                variant="outline"
                className="w-full"
                onClick={() => setAssignChoreOpen(true)}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Assign Chore
            </Button>
        </CardFooter>
      </Card>
      <AssignChoreDialog
        isOpen={isAssignChoreOpen}
        setOpen={setAssignChoreOpen}
        member={member}
      />
    </>
  );
};