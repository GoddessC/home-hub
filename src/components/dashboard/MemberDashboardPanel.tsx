import { useState, useMemo } from 'react';
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

interface MemberDashboardPanelProps {
  member: Member;
  chores: ChoreLog[];
}

export const MemberDashboardPanel = ({ member, chores }: MemberDashboardPanelProps) => {
  const queryClient = useQueryClient();
  const { household, isAnonymous } = useAuth();
  const [isFeelingsDialogOpen, setFeelingsDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
      <div className={cn("transition-all duration-300 ease-in-out", isExpanded ? "col-span-full md:col-span-2 lg:col-span-2" : "col-span-1")}>
        <Card
          className={cn(
            "w-full flex flex-col cursor-pointer transition-all duration-300 ease-in-out relative",
            isAnonymous ? "dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-white hover:bg-gray-50",
            isExpanded ? "min-h-[24rem]" : "aspect-square items-center justify-center text-center"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {!isExpanded ? (
            <>
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold z-10">
                {isLoadingScore ? <Skeleton className="h-4 w-8 bg-primary/50" /> : `${weeklyScore} pts`}
              </div>
              <div className="flex flex-col items-center justify-center p-2">
                <MemberAvatar memberId={member.id} className="w-24 h-36 mb-2" viewMode="headshot" />
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
                            setIsExpanded(false);
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
                                onCheckedChange={(checked) => updateChoreMutation.mutate({ choreId: chore.id, isCompleted: !!checked })}
                            />
                            <label htmlFor={`${member.id}-${chore.id}`} className="flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {choreData?.title}
                            </label>
                            <span className="font-semibold text-primary">+{choreData?.points} pt</span>
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