import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, CheckSquare, Square } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { Button } from '../ui/button';

export interface Quest {
  id: string;
  name: string;
  reward_points_each: number;
  quest_sub_tasks: {
    id: string;
    description: string;
    is_completed: boolean;
    member_id: string;
    members: {
      id: string;
      full_name: string;
    } | null;
  }[];
}

interface TeamQuestPanelProps {
  quest: Quest | null;
  isLoading: boolean;
}

export const TeamQuestPanel = ({ quest, isLoading }: TeamQuestPanelProps) => {
  const queryClient = useQueryClient();
  const { member: currentUserMember, isAnonymous, household } = useAuth();

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('quest_sub_tasks')
        .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_quest', household?.id] });
    },
    onError: (error: Error) => {
      showError(`Failed to update task: ${error.message}`);
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  // Only render the panel if there is an active quest.
  if (!quest) {
    return null;
  }

  const completedTasks = quest.quest_sub_tasks.filter(t => t.is_completed).length;
  const totalTasks = quest.quest_sub_tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const participants = [...new Set(quest.quest_sub_tasks.map(t => t.members?.full_name).filter(Boolean))];

  return (
    <Card className="bg-primary/5 text-primary-foreground border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl text-primary">{quest.name}</CardTitle>
            <CardDescription className="text-primary/80">
              A team quest for: {participants.join(', ')}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold flex items-center gap-2 text-amber-500">
              <Trophy className="h-8 w-8" /> {quest.reward_points_each}
            </p>
            <p className="text-xs text-amber-500/80">Points Each!</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-primary">Quest Progress</span>
              <span className="text-sm text-primary/80">{completedTasks} / {totalTasks} Tasks</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {quest.quest_sub_tasks.map(task => {
              const isOwner = !isAnonymous && currentUserMember?.id === task.member_id;
              const isAdmin = !isAnonymous && (currentUserMember?.role === 'OWNER' || currentUserMember?.role === 'ADULT');
              const canComplete = isOwner || isAdmin;

              return (
                <div
                  key={task.id}
                  className={`p-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    task.is_completed ? 'bg-green-500/20 text-green-800' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    disabled={!canComplete || updateTaskMutation.isPending}
                    onClick={() => {
                      if (canComplete) {
                        updateTaskMutation.mutate({ taskId: task.id, isCompleted: !task.is_completed });
                      }
                    }}
                  >
                    {task.is_completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </Button>
                  <span className={task.is_completed ? 'line-through' : ''}>{task.description}</span>
                  <span className="text-xs opacity-70 ml-auto whitespace-nowrap">({task.members?.full_name})</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};