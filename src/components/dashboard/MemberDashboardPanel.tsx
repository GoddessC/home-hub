import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Member, useAuth } from '@/context/AuthContext';
import { Button } from '../ui/button';
import { FeelingsCheckinDialog } from './FeelingsCheckinDialog';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChoreLog } from '@/pages/KioskDashboard';
import { MemberAvatar } from '../avatar/MemberAvatar';
import { getMemberAvailablePoints } from '@/utils/pointsUtils';

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

  // Get available points (total earned - total spent) - this should match the store
  const { data: availablePoints, isLoading: isLoadingAvailablePoints, error: pointsError } = useQuery({
    queryKey: ['member_available_points', member.id],
    queryFn: async () => {
      if (!member?.id) return 0;
      return await getMemberAvailablePoints(member.id);
    },
    enabled: !!member?.id,
  });

  // Get member's current feeling for avatar display
  const { data: currentFeeling } = useQuery({
    queryKey: ['member_current_feeling', member.id],
    queryFn: async () => {
      if (!household) return null;
      const { data, error } = await supabase
        .from('feelings_log')
        .select('feeling')
        .eq('member_id', member.id)
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data && data.length > 0 ? data[0].feeling : null;
    },
    enabled: !!member && !!household,
  });

  // Get weekly points for display purposes (currently not used but kept for future use)
  // const { data: weeklyScore } = useQuery({
  //   queryKey: ['member_weekly_score', member.id],
  //   queryFn: async () => {
  //     const weekStartsOn = (household?.chore_reset_day as (0 | 1 | 2 | 3 | 4 | 5 | 6)) ?? 0;
  //     return await getMemberWeeklyPoints(member.id, weekStartsOn);
  //   },
  //   enabled: !!member && !!household,
  // });

  const { data: achievements } = useQuery<Achievements>({
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
        .select('created_at, quests(reward_points_each)')
        .eq('member_id', member.id)
        .gte('completed_at', twentyFourHoursAgo.toISOString())
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);
      
      if (error) return null;
      return data.length > 0 ? {
        points_awarded: (data[0].quests as any)?.reward_points_each || 0,
        created_at: data[0].created_at
      } : null;
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
      // Invalidate points queries to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ['member_available_points', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member_weekly_score', member.id] });
      queryClient.invalidateQueries({ queryKey: ['member_all_time_score', member.id] });
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
        "transition-all duration-500 ease-in-out h-full overflow-hidden",
        isExpanded ? "col-span-full md:col-span-2 lg:col-span-2" : "col-span-1"
      )}>
        <Card
          className={cn(
            "w-full flex flex-col cursor-pointer transition-all duration-500 ease-in-out relative transform",
            isAnonymous ? "dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-white hover:bg-gray-50",
            isExpanded ? "h-full flex-1 shadow-xl" : "aspect-rectangle items-center justify-center text-center shadow-md hover:shadow-lg"
          )}
          onClick={() => onToggleExpanded(!isExpanded)}
        >
          {!isExpanded ? (
            <>
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold z-10">
                {isLoadingAvailablePoints ? (
                  <Skeleton className="h-4 w-8 bg-primary/50" />
                ) : pointsError ? (
                  <span className="text-red-200">Error</span>
                ) : (
                  `${availablePoints ?? 0} pts`
                )}
              </div>
              <div className="flex flex-col items-center justify-center p-2">
                <MemberAvatar memberId={member.id} className="w-24 h-36 mb-2" currentFeeling={currentFeeling} />
                <h3 className="font-bold text-lg">{member.full_name}</h3>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col cursor-default glass-box" onClick={(e) => e.stopPropagation()}>
              <CardContent className="flex-grow flex flex-row gap-6 items-stretch justify-between p-6">
                {/* Left Section - Avatar */}
                <div className="flex flex-col items-center gap-4 w-1/3">
                  <MemberAvatar
                    memberId={member.id}
                    className=" w-2/4 h-full"
                    viewMode="full"
                    currentFeeling={currentFeeling}
                  />
                  {!isAnonymous && (
                    <Button asChild variant="outline" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/avatar-builder/${member.id}`}>
                        <Palette className="mr-2 h-4 w-4" />
                        Edit Avatar
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Right Section - Chores */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="mb-4 text-lg font-semibold text-muted-foreground">Today's Chores</h4>
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
                      <p className="text-sm text-muted-foreground text-center py-8">No chores for today!</p>
                    )}
                  </div>
                </div>
              </CardContent>

              {/* Bottom Section - Badges and Feelings Button */}
              <div className="flex items-center justify-between p-6 pt-0">
                {/* Badges Section - Bottom Center */}
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-4">
                    {achievements?.has_completed_quest && (
                      <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-full text-sm font-medium">
                        <img src="/orange-check.png" alt="Quest Complete!" className="w-6 h-6" />
                        Quest Complete!
                      </div>
                    )}
                    {achievements?.has_completed_chores && !achievements?.has_completed_quest && (
                      <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                        <img src="/orange-check.png" alt="All Chores Done!" className="w-6 h-6" />
                        All Chores Done!
                      </div>
                    )}
                    {showQuestBadge && (
                      <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-2 rounded-full text-sm font-medium">
                        <img src="/quest_badge.png" alt="Quest Reward!" className="w-6 h-6" />
                        +{questPoints} Quest Reward!
                      </div>
                    )}
                  </div>
                </div>

                {/* Feelings Button - Bottom Right */}
                {household?.is_feelings_enabled && checkinStatus.showButton && (
                  <Button 
                    onClick={(e) => { e.stopPropagation(); setFeelingsDialogOpen(true); }}
                    className="rounded-full w-12 h-12 p-0 bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    size="lg"
                  >
                    <span className="text-lg">😊</span>
                  </Button>
                )}
              </div>
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