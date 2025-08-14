import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { Rocket } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ConfettiCelebration } from '../effects/ConfettiCelebration';

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

interface TeamQuestPanelProps {
    quest: Quest | null | undefined;
    isLoading: boolean;
}

export const TeamQuestPanel = ({ quest, isLoading }: TeamQuestPanelProps) => {
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);

  const updateSubTaskMutation = useMutation({
    mutationFn: async ({ subTaskId, isCompleted }: { subTaskId: string, isCompleted: boolean }) => {
      const { data, error } = await supabase
        .from('quest_sub_tasks')
        .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
        .eq('id', subTaskId)
        .select('*, members(id, full_name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedSubTask) => {
      queryClient.setQueryData(['active_quest', household?.id], (oldData: Quest | undefined | null) => {
        if (!oldData) return oldData;
        
        const newSubTasks = oldData.quest_sub_tasks.map(task => 
          task.id === updatedSubTask.id ? updatedSubTask : task
        );

        return {
          ...oldData,
          quest_sub_tasks: newSubTasks,
        };
      });
    },
    onError: (error: Error) => showError(error.message),
  });

  const { progress, completedCount, totalCount, isComplete } = useMemo(() => {
    if (!quest) return { progress: 0, completedCount: 0, totalCount: 0, isComplete: false };
    const total = quest.quest_sub_tasks.length;
    const completed = quest.quest_sub_tasks.filter(t => t.is_completed).length;
    return {
      progress: total > 0 ? (completed / total) * 100 : 0,
      completedCount: completed,
      totalCount: total,
      isComplete: total > 0 && completed === total,
    };
  }, [quest]);

  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true);
    }
  }, [isComplete]);

  const handleConfettiComplete = () => {
    setShowConfetti(false);
    // After confetti, refetch data to remove the panel and update points
    queryClient.invalidateQueries({ queryKey: ['active_quest', household?.id] });
    queryClient.invalidateQueries({ queryKey: ['member_score'] });
    queryClient.invalidateQueries({ queryKey: ['member_weekly_score'] });
    queryClient.invalidateQueries({ queryKey: ['member_all_time_score'] });
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!quest) {
    return null;
  }

  return (
    <>
      {showConfetti && <ConfettiCelebration onComplete={handleConfettiComplete} />}
      <Card className="relative w-full bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-800 overflow-hidden">
        {isComplete && (
          <div className="absolute inset-0 bg-green-500/95 z-10 flex items-center justify-center animate-fade-in">
            <h2 className="text-5xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Completed!
            </h2>
          </div>
        )}
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
    </>
  );
};