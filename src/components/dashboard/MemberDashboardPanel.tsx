import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { startOfWeek, endOfWeek, format, isToday } from 'date-fns';
import { Member, useAuth } from '@/context/AuthContext';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { FeelingsCheckinDialog } from './FeelingsCheckinDialog';

type ChoreLog = {
  id: string;
  completed_at: string | null;
  chores: {
    title: string;
    points: number;
  } | null;
};

const feelingMeta = {
  joyful: { emoji: '😄' },
  happy: { emoji: '😊' },
  okay: { emoji: '😐' },
  sad: { emoji: '😢' },
  worried: { emoji: '😟' },
  angry: { emoji: '😠' },
};

interface MemberDashboardPanelProps {
  member: Member;
  chores: ChoreLog[];
}

export const MemberDashboardPanel = ({ member, chores }: MemberDashboardPanelProps) => {
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const [isFeelingsDialogOpen, setFeelingsDialogOpen] = useState(false);

  // --- Chore-related hooks ---
  const { data: weeklyScore, isLoading: isLoadingScore } = useQuery({
    queryKey: ['member_score', member.id],
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

  // --- Feelings-related hooks ---
  const { data: lastLog } = useQuery({
    queryKey: ['last_feeling_log', member.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feelings_log')
        .select('feeling, created_at')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!member && (household?.is_feelings_enabled ?? false),
  });

  const lastLogIsToday = lastLog && isToday(new Date(lastLog.created_at));
  const lastFeelingEmoji = lastLogIsToday ? feelingMeta[lastLog.feeling as keyof typeof feelingMeta]?.emoji : null;

  return (
    <>
      <Card className="w-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{member.full_name}</CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold">{isLoadingScore ? <Skeleton className="h-8 w-12" /> : weeklyScore}</p>
            <p className="text-xs text-muted-foreground">Points this week</p>
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div>
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
          </div>

          {household?.is_feelings_enabled && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Feelings Check-in</h4>
              <div className="flex flex-col items-center justify-center gap-4">
                {lastFeelingEmoji ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Today you're feeling:</p>
                    <p className="text-6xl">{lastFeelingEmoji}</p>
                  </div>
                ) : (
                  <Button onClick={() => setFeelingsDialogOpen(true)}>Log My Feeling</Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <FeelingsCheckinDialog
        isOpen={isFeelingsDialogOpen}
        setOpen={setFeelingsDialogOpen}
        member={member}
      />
    </>
  );
};