import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { Rocket } from 'lucide-react';
import { useMemo } from 'react';

// Define and export types so they can be shared
export type SubTask = {
  id: string;
  description: string;
  is_completed: boolean;
  members: {
    id: string;
    full_name: string;
  } | null;
};

export type Quest = {
  id: string;
  name: string;
  reward_points_each: number;
  quest_sub_tasks: SubTask[];
};

export const TeamQuestPanel = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { data: quest, isLoading } = useQuery<Quest | null>({
    queryKey: ['active_quest', household?.id],
    queryFn: async () => {
      if (!household?.id) return null;
      const { data, error } = await supabase
        .from('quests')
        .select('id, name, reward_points_each, quest_sub_tasks(*, members(id, full_name))')
        .eq('household_id', household.id)
        .eq('status', 'ACTIVE')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const updateSubTaskMutation = useMutation({
    mutationFn: async ({ subTaskId, isCompleted }: { subTaskId: string, isCompleted: boolean }) => {
      const { error } = await supabase
        .from('quest_sub_tasks')
        .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
        .eq('id', subTaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      // No need to invalidate here, the trigger will cause a broadcast that KioskDashboard listens to.
    },
    onError: (error: Error) => showError(error.message),
  });

  const { progress, completedCount, totalCount } = useMemo(() => {
    if (!quest) return { progress: 0, completedCount: 0, totalCount: 0 };
    const total = quest.quest_sub_tasks.length;
    const completed = quest.quest_sub_tasks.filter(t => t.is_completed).length;
    return {
      progress: total > 0 ? (completed / total) * 100 : 0,
      completedCount: completed,
      totalCount: total,
    };
  }, [quest]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!quest) {
    return null; // Don't render anything if there's no active quest
  }

  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-purple-800 dark:text-purple-200">
          <Rocket className="h-6 w-6" />
          <span>Team Quest: {quest.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1 text-sm font-medium text-purple-700 dark:text-purple-300">
            <span>Progress</span>
            <span>{completedCount} / {totalCount} Tasks</span>
          </div>
          <Progress value={progress} className="[&>*]:bg-purple-500" />
        </div>
        <div className="space-y-3">
          {quest.quest_sub_tasks.map(task => (
            <div key={task.id} className="flex items-center space-x-3 p-3 rounded-md bg-background/50">
              <Checkbox
                id={`subtask-${task.id}`}
                checked={task.is_completed}
                onCheckedChange={(checked) => updateSubTaskMutation.mutate({ subTaskId: task.id, isCompleted: !!checked })}
                disabled={task.is_completed || updateSubTaskMutation.isPending}
              />
              <label htmlFor={`subtask-${task.id}`} className="flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {task.description}
              </label>
              <span className="text-xs font-semibold text-muted-foreground">{task.members?.full_name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};