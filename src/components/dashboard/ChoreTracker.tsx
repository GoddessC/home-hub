import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { startOfWeek, endOfWeek, format } from 'date-fns';

type ChoreLog = {
  id: string;
  completed_at: string | null;
  chores: {
    title: string;
    points: number;
  } | null;
};

export const ChoreTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: chores, isLoading: isLoadingChores } = useQuery({
    queryKey: ['my_chores', user?.id, 'today'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chore_log')
        .select('id, completed_at, chores(title, points)')
        .eq('user_id', user.id)
        .eq('due_date', new Date().toISOString().slice(0, 10));
      if (error) throw error;
      return data as ChoreLog[];
    },
    enabled: !!user,
  });

  const { data: weeklyScore, isLoading: isLoadingScore } = useQuery({
    queryKey: ['my_score', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('chore_log')
        .select('chores(points)')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('due_date', weekStart)
        .lte('due_date', weekEnd);
      if (error) throw error;
      return data.reduce((acc, item) => acc + (item.chores?.points || 0), 0);
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ['my_chores'] });
      queryClient.invalidateQueries({ queryKey: ['my_score'] });
    },
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Today's Chores</CardTitle>
        <div className="text-right">
          <p className="text-2xl font-bold">{isLoadingScore ? <Skeleton className="h-8 w-12" /> : weeklyScore}</p>
          <p className="text-sm text-muted-foreground">Points this week</p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingChores ? <Skeleton className="h-24 w-full" /> : (
          <ul className="space-y-3">
            {chores?.map(chore => (
              <li key={chore.id} className="flex items-center space-x-3 p-3 rounded-md bg-background">
                <Checkbox
                  id={chore.id}
                  checked={!!chore.completed_at}
                  onCheckedChange={(checked) => updateChoreMutation.mutate({ choreId: chore.id, isCompleted: !!checked })}
                />
                <label htmlFor={chore.id} className="flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {chore.chores?.title}
                </label>
                <span className="font-semibold text-primary">+{chore.chores?.points} pt</span>
              </li>
            ))}
            {chores?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No chores for you today. Great job!</p>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};