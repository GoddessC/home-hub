import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Member } from '@/context/AuthContext';

type ChoreLog = {
  id: string;
  completed_at: string | null;
  chores: {
    title: string;
    points: number;
  } | null;
};

interface MemberChoreCardProps {
  member: Member;
  chores: ChoreLog[];
}

export const MemberChoreCard = ({ member, chores }: MemberChoreCardProps) => {
  const queryClient = useQueryClient();

  const { data: weeklyScore, isLoading: isLoadingScore } = useQuery({
    queryKey: ['member_score', member.id],
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
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
    enabled: !!member,
  });

  const updateChoreMutation = useMutation({
    mutationFn: async ({ choreId, isCompleted }: { choreId: string, isCompleted: boolean }) => {
      const { error } = await supabase
        .from('chore_log')
        .update({ completed_at: isCompleted ? new Date().toISOString() : null })
        .eq('id', choreId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chore_log'] });
      queryClient.invalidateQueries({ queryKey: ['member_score', member.id] });
    },
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{member.full_name}</CardTitle>
        <div className="text-right">
          <p className="text-2xl font-bold">{isLoadingScore ? <Skeleton className="h-8 w-12" /> : weeklyScore}</p>
          <p className="text-xs text-muted-foreground">Points this week</p>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="mb-2 text-sm font-medium text-muted-foreground">Today's Chores</h4>
        {chores.length > 0 ? (
          <ul className="space-y-3">
            {chores.map(chore => (
              <li key={chore.id} className="flex items-center space-x-3 p-3 rounded-md bg-background">
                <Checkbox
                  id={`${member.id}-${chore.id}`}
                  checked={!!chore.completed_at}
                  onCheckedChange={(checked) => updateChoreMutation.mutate({ choreId: chore.id, isCompleted: !!checked })}
                />
                <label htmlFor={`${member.id}-${chore.id}`} className="flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {chore.chores?.title}
                </label>
                <span className="font-semibold text-primary">+{chore.chores?.points} pt</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No chores for today!</p>
        )}
      </CardContent>
    </Card>
  );
};