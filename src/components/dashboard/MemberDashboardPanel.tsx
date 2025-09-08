import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Member, useAuth } from '@/context/AuthContext';
import { Button } from '../ui/button';
import { FeelingsCheckinDialog } from './FeelingsCheckinDialog';
import { X, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChoreLog } from '@/pages/KioskDashboard';
import { MemberAvatar } from '../avatar/MemberAvatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface MemberDashboardPanelProps {
  member: Member;
  chores: ChoreLog[];
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

interface Achievements {
    has_completed_chores: boolean;
    has_completed_quest: boolean;
}

export const MemberDashboardPanel = ({ member, chores, isExpanded, onToggleExpanded }: MemberDashboardPanelProps) => {
  const queryClient = useQueryClient();
  const { household, isAnonymous } = useAuth();
  const [isFeelingsDialogOpen, setFeelingsDialogOpen] = useState(false);
  const [showQuestBadge, setShowQuestBadge] = useState(false);
  const [questPoints, setQuestPoints] = useState(0);

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
      return data.reduce((acc, item: any) => acc + (Array.isArray(item.chores) ? item.chores[0]?.points : item.chores?.points || 0), 0);
    },
    enabled: !!member && !!household,
  });

  const { data: achievements, isLoading: isLoadingAchievements } = useQuery<Achievements>({
    queryKey: ['member_achievements', member.id],
    queryFn: async () => {
        const { data, error } = await supabase.rpc('get_member_achievements', { p_member_id: member.id });
        if (error) throw error;
        return data;
    },
    enabled: !!member.id,
  });

  const { data: recentCompletedQuest } = useQuery({
    queryKey: ['recent_completed_quest', member.id],
    queryFn: async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('quest_sub_tasks')
        .select('points_awarded, created_at')
        .eq('member_id', member.id)
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) return null;
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!member.id,
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (recentCompletedQuest) {
      setShowQuestBadge(true);
      setQuestPoints(recentCompletedQuest.points_awarded);
      
      // Calculate time remaining until 24 hours expire
      const questTime = new Date(recentCompletedQuest.created_at);
      const now = new Date();
      const timeRemaining = (24 * 60 * 60 * 1000) - (now.getTime() - questTime.getTime());
      
      // Hide the badge when 24 hours have passed
      const timer = setTimeout(() => {
        setShowQuestBadge(false);
      }, Math.max(0, timeRemaining));
      
      return () => clearTimeout(timer);
    } else {
      // If no recent quest, hide the badge
      setShowQuestBadge(false);
    }
  }, [recentCompletedQuest]);

  const updateChoreMutation = useMutation<
    void,
    Error,
    { choreId: string; isCompleted: boolean },
    { previousDailyChores: any[] | undefined; todayKey: (string | number)[] } 
  >({
    mutationFn: async ({ choreId, isCompleted }: { choreId: string; isCompleted: boolean }) => {
      // Only allow marking as completed, not unchecking
      if (!isCompleted) {
        throw new Error("Cannot uncheck completed chores");
      }
      
      const { error } = await supabase
        .from('chore_log')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', choreId);
      if (error) throw error;
    },
    onMutate: async ({ choreId, isCompleted }) => {
      if (!household?.id) return { previousDailyChores: undefined, todayKey: [] };

      // Only allow marking as completed, not unchecking
      if (!isCompleted) {
        throw new Error("Cannot uncheck completed chores");
      }

      const todayKey = ['daily_chores', household.id, format(new Date(), 'yyyy-MM-dd')];

      await queryClient.cancelQueries({ queryKey: todayKey });

      const previousDailyChores = queryClient.getQueryData<any[]>(todayKey);

      queryClient.setQueryData<any[]>(todayKey, (old) => {
        if (!old) return old as any;
        return old.map((entry) =>
          entry.id === choreId
            ? { ...entry, completed_at: new Date().toISOString() }
            : entry
        );
      });

      return { previousDailyChores, todayKey };
    },
    onError: (error, _variables, context) => {
      showError(error.message);
      if (context?.todayKey?.length) {
        queryClient.setQueryData(context.todayKey, context.previousDailyChores);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.todayKey?.length) {
        queryClient.invalidateQueries({ queryKey: context.todayKey });
      }
      queryClient.invalidateQueries({ queryKey: ['member_score', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member_achievements', member.id] });
      // Also invalidate all member achievements to refresh banners for all members
      queryClient.invalidateQueries({ queryKey: ['member_achievements'] });
    },
  });

  const { data: todaysLogs } = useQuery({
    queryKey: ['todays_feeling_logs', member.id],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from('feelings_log')
        .select('feeling, created_at')
        .eq('member_id', member.id)
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!member && (household?.is_feelings_enabled ?? false),
    refetchInterval: 60000,
  });

  const checkinStatus = useMemo(() => {
    if (!household || !household.is_feelings_enabled) {
      return { showButton: false };
    }

    const { feelings_morning_time, feelings_evening_time } = household;
    const now = new Date();

    const parseTime = (timeStr: string | null): Date | null => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date;
    };

    const morningTime = parseTime(feelings_morning_time);
    const eveningTime = parseTime(feelings_evening_time);

    const hasLoggedinWindow = (start: Date, end: Date | null) => {
      return todaysLogs?.some(log => {
        const logTime = new Date(log.created_at);
        const endTime = end || new Date(new Date().setHours(23, 59, 59, 999));
        return logTime >= start && logTime < endTime;
      }) ?? false;
    };

    let showButton = false;
    if (morningTime && now >= morningTime && (!eveningTime || now < eveningTime)) {
      if (!hasLoggedinWindow(morningTime, eveningTime)) showButton = true;
    }
    if (eveningTime && now >= eveningTime) {
      if (!hasLoggedinWindow(eveningTime, null)) showButton = true;
    }

    return { showButton };
  }, [todaysLogs, household]);

  return (
    <>
      <div className={cn(
        "transition-all duration-500 ease-in-out transform",
        isExpanded ? "col-span-full md:col-span-2 lg:col-span-2 scale-105" : "col-span-1 scale-100"
      )}>
        <Card
          className={cn(
            "w-full flex flex-col cursor-pointer transition-all duration-500 ease-in-out relative transform",
            isAnonymous ? "dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-white hover:bg-gray-50",
            isExpanded ? "min-h-[24rem] shadow-xl" : "aspect-square items-center justify-center text-center shadow-md hover:shadow-lg"
          )}
          onClick={() => onToggleExpanded(!isExpanded)}
        >
          {!isLoadingAchievements && (
            <>
              {achievements?.has_completed_chores && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img src="/orange-check.png" alt="All Chores Done!" className={cn("absolute w-20 h-20 transition-all duration-300 z-20 top-10 right-0")} />
                  </TooltipTrigger>
                  <TooltipContent><p>All Chores Done Today!</p></TooltipContent>
                </Tooltip>
              )}
              {achievements?.has_completed_quest && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img src="/orange-check.png" alt="Quest Complete!" className={cn("absolute w-20 h-20 transition-all duration-300 z-20", isExpanded ? "top-15 right-0" : "top-15 right-0")} />
                  </TooltipTrigger>
                  <TooltipContent><p>Team Quest Completed!</p></TooltipContent>
                </Tooltip>
              )}
              {showQuestBadge && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute z-30 transition-all duration-300 animate-bounce" style={{ top: "-30px", right: isExpanded ? "20px" : "0" }}>
                      <div className="relative">
                        <img src="/quest_badge.png" alt="Quest Reward!" className="w-16 h-16" />
                        <div className="absolute inset-0 flex items-center justify-center text-black font-bold text-lg" style={{ paddingBottom: "4px" }}>
                          +{questPoints}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>Quest Reward Earned!</p></TooltipContent>
                </Tooltip>
              )}
            </>
          )}
          {!isExpanded ? (
            <>
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold z-10">
                {isLoadingScore ? <Skeleton className="h-4 w-8 bg-primary/50" /> : `${weeklyScore} pts`}
              </div>
              <div className="flex flex-col items-center justify-center p-2">
                <MemberAvatar memberId={member.id} className="w-24 h-36 mb-2" />
                <h3 className="font-bold text-lg">{member.full_name}</h3>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col cursor-default" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle>{member.full_name}</CardTitle>
                <div className="flex items-start gap-2">
                    <div className="text-right">
                        <p className="text-2xl font-bold">{isLoadingScore ? <Skeleton className="h-8 w-12" /> : weeklyScore}</p>
                        <p className="text-xs text-muted-foreground">Points this week</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpanded(false);
                        }}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Today's Chores</h4>
                  {chores.length > 0 ? (
                    <ul className="space-y-3">
                      {chores.map(chore => {
                        const choreData = Array.isArray(chore.chores) ? chore.chores[0] : chore.chores;
                        return (
                            <li key={chore.id} className="flex items-center space-x-3 p-3 rounded-md bg-background">
                            <Checkbox
                                id={`${member.id}-${chore.id}`}
                                checked={!!chore.completed_at}
                                disabled={!!chore.completed_at}
                                onCheckedChange={(checked) => {
                                  // Only allow checking, not unchecking
                                  if (checked && !chore.completed_at) {
                                    updateChoreMutation.mutate({ choreId: chore.id, isCompleted: true });
                                  }
                                }}
                            />
                            <label 
                              htmlFor={`${member.id}-${chore.id}`} 
                              className={`flex-grow text-sm font-medium leading-none ${
                                chore.completed_at 
                                  ? 'cursor-not-allowed opacity-70 line-through text-muted-foreground' 
                                  : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                              }`}
                            >
                                {choreData?.title}
                            </label>
                            <span className={`font-semibold ${chore.completed_at ? 'text-muted-foreground' : 'text-primary'}`}>
                              +{choreData?.points} pt
                            </span>
                            </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No chores for today!</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {household?.is_feelings_enabled && checkinStatus.showButton && (
                            <Button onClick={(e) => { e.stopPropagation(); setFeelingsDialogOpen(true); }}>
                                Log My Feeling
                            </Button>
                        )}
                        {!isAnonymous && (
                            <Button asChild variant="outline" onClick={(e) => e.stopPropagation()}>
                                <Link to={`/avatar-builder/${member.id}`}>
                                    <Palette className="mr-2 h-4 w-4" />
                                    Edit Avatar
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
              </CardContent>
            </div>
          )}
        </Card>
      </div>
      <FeelingsCheckinDialog
        isOpen={isFeelingsDialogOpen}
        setOpen={setFeelingsDialogOpen}
        member={member}
      />
    </>
  );
};