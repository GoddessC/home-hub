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
  id:string;
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
  const [justCompleted, setJustCompleted] = useState(false);

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
      queryClient.setQueryData(['active_quests', household?.id], (oldData: Quest[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(quest => {
          const newSubTasks = quest.quest_sub_tasks.map(task => 
            task.id === updatedSubTask.id ? updatedSubTask : task
          );
          return {
            ...quest,
            quest_sub_tasks: newSubTasks,
          };
        });
      });
    },
    onError: (error: Error) => showError(error.message),
  });

  const completeQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      const { error } = await supabase
        .from('quests')
        .update({ 
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('id', questId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Remove the quest from the active quests list
      queryClient.setQueryData(['active_quests', household?.id], (oldData: Quest[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(q => q.id !== quest?.id);
      });
      
      // Update points and achievements
      queryClient.invalidateQueries({ queryKey: ['member_available_points'] });
      queryClient.invalidateQueries({ queryKey: ['member_weekly_score'] });
      queryClient.invalidateQueries({ queryKey: ['member_all_time_score'] });
      queryClient.invalidateQueries({ queryKey: ['member_achievements'] });
    },
    onError: (error: Error) => {
      console.error('Error completing quest:', error);
      showError('Failed to complete quest');
    },
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
      setJustCompleted(true);
    }
  }, [isComplete]);

  const handleConfettiComplete = () => {
    setShowConfetti(false);
    
    // Mark the quest as completed using the mutation
    if (quest?.id) {
      completeQuestMutation.mutate(quest.id);
    }
    
    // Reset the completion state
    setJustCompleted(false);
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
        {(isComplete || justCompleted) && (
          <div className="absolute inset-0 bg-green-500/95 z-10 flex items-center justify-center animate-fade-in">
            <h2 className="text-5xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Completed!
            </h2>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-purple-800 dark:text-purple-200">
              <Rocket className="h-6 w-6" />
              <span>Team Quest: {quest.name}</span>
            </CardTitle>
            <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-800/50 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Reward:</span>
              <span className="text-lg font-bold text-purple-800 dark:text-purple-200">
                {quest.reward_points_each} pts
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Progress: {completedCount} / {totalCount} Tasks
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                  <span>🎯</span>
                  <span>{quest.reward_points_each} points each</span>
                </div>
              </div>
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