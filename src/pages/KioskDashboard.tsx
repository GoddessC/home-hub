import { useAuth, Member } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';
import { Link } from 'react-router-dom';
import { Leaf, Shield } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/layout/UserNav';
import { MemberDashboardPanel } from '@/components/dashboard/MemberDashboardPanel';
import { TeamQuestPanel, Quest } from '@/components/dashboard/TeamQuestPanel';
// removed WeatherIcon from header per request
import { SchedulePanel } from '@/components/dashboard/SchedulePanel';
import { AlarmModal } from '@/components/alarms/AlarmModal';
import { useAlarmSystem } from '@/hooks/useAlarmSystem';
import { MemberAvatar } from '@/components/avatar/MemberAvatar';

export type ChoreLog = {
  id: string;
  completed_at: string | null;
  member_id: string;
  chores: {
    title: string;
    points: number;
  } | {
    title: string;
    points: number;
  }[] | null;
};

const KioskDashboard = () => {
  const { device, household, signOut, isAnonymous, member } = useAuth();
  const [isCalmCornerSuggested, setIsCalmCornerSuggested] = useState(false);
  const [headerTime, setHeaderTime] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Alarm system
  const { activeAlarm, dismissAlarm, snoozeAlarm, isAlarmActive } = useAlarmSystem();

  useEffect(() => {
    const t = setInterval(() => setHeaderTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!household || !isAnonymous) return;

    const channel = supabase
      .channel('calm-corner-suggestions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calm_corner_suggestions',
          filter: `household_id=eq.${household.id}`,
        },
        (payload) => {
          if (!payload.new.acknowledged_at) {
            setIsCalmCornerSuggested(true);
            const audio = new Audio('/ding.mp3');
            audio.play().catch(e => console.error("Could not play audio:", e));
            
            if (suggestionTimer.current) clearTimeout(suggestionTimer.current);

            suggestionTimer.current = setTimeout(() => {
              setIsCalmCornerSuggested(false);
            }, 180000); // 3 minutes

            supabase
              .from('calm_corner_suggestions')
              .update({ acknowledged_at: new Date().toISOString() })
              .eq('id', payload.new.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    };
  }, [household, isAnonymous]);

  const { data: members, isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ['members', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('members').select('*').eq('household_id', household.id).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const { data: chores, isLoading: isLoadingChores } = useQuery<ChoreLog[]>({
    queryKey: ['daily_chores', household?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .rpc('get_or_create_daily_chores', {
          p_household_id: household.id,
          p_for_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .select('id, member_id, completed_at, chores(title, points)');
      
      if (error) throw error;
      return data as ChoreLog[];
    },
    enabled: !!household?.id,
  });

  const { data: activeQuest, isLoading: isLoadingQuest } = useQuery<Quest | null>({
    queryKey: ['active_quest', household?.id],
    queryFn: async () => {
      if (!household?.id) return null;
      const { data, error } = await supabase
        .from('quests')
        .select('id, name, reward_points_each, quest_sub_tasks(*, members(id, full_name))')
        .eq('household_id', household.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const handleCalmCornerClick = () => {
    if (isCalmCornerSuggested) {
      setIsCalmCornerSuggested(false);
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
    }
  };

  return (
    <div className={cn("flex flex-col min-h-screen dashboardBG", isAnonymous ? "text-white dark" : "")}>
      <header className={cn("p-4 sticky top-0 z-40", isAnonymous ? " shadow-md" : "shadow-sm")}>
        <div className="w-full px-4 flex justify-between items-center">
          <h1 className={cn("text-2xl font-bold", isAnonymous ? "" : "text-gray-800")}>
            {household?.name || (isAnonymous ? 'Kiosk Mode' : 'Dashboard')}
          </h1>
          <AnnouncementPanel />
          <div className="flex items-center space-x-4">
            <div className={cn("font-mono font-semibold", isAnonymous ? "text-white" : "text-gray-800")}>{format(headerTime, 'h:mm a')}</div>
            {isAnonymous ? (
              <>
                <span className="text-sm text-gray-400">{device?.display_name}</span>
                <Button variant="destructive" onClick={signOut}>Exit Kiosk Mode</Button>
              </>
            ) : (
              <>
                {member?.role === 'OWNER' && (
                  <Button asChild variant="outline">
                    <Link to="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </Button>
                )}
                <UserNav />
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8 main-container bottom-right glass-card h-full overflow-hidden">
        <div className="flex gap-6 items-stretch h-full">
          {/* Left: Members column */}
          <div className="w-56 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {isLoadingMembers ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className={cn("h-20 w-full rounded-lg", isAnonymous && "bg-gray-700")} />
                ))
              ) : (
                members?.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(prev => prev === m.id ? null : m.id)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-xl border text-left transition-colors h-40",
                      selectedMemberId === m.id ? "bg-primary/10 border-primary" : "bg-background/70 hover:bg-accent"
                    )}
                  >
                    <MemberAvatar memberId={m.id} className="w-10 h-14" />
                    <div className="flex-1">
                      <div className="font-medium truncate">{m.full_name}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Center: Selected member details */}
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <div className="grid h-full">
              <TeamQuestPanel quest={activeQuest} isLoading={isLoadingQuest} />
              <div className="h-full flex flex-col">
                {isLoadingMembers || isLoadingChores ? (
                  <Skeleton className={cn("h-96 w-full rounded-lg", isAnonymous && "bg-gray-700")} />
                ) : (
                  (() => {
                    const selected = members?.find((m) => m.id === selectedMemberId) ?? null;
                    if (!selected) {
                      return <div className="text-center text-muted-foreground py-16">No member selected.</div>;
                    }
                    return (
                      <MemberDashboardPanel
                        key={selected.id}
                        member={selected}
                        chores={chores?.filter((c) => c.member_id === selected.id) || []}
                        isExpanded={true}
                        onToggleExpanded={() => {}}
                      />
                    );
                  })()
                )}
              </div>
            </div>
          </div>

          {/* Right: Schedule */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <SchedulePanel />
          </div>
        </div>
      </main>
 
      {household?.is_calm_corner_enabled && (
        <Link to="/kiosk/calm-corner" className="fixed bottom-[.9rem] right-2" onClick={handleCalmCornerClick}>
            <Button 
                variant="secondary" 
                size="lg" 
                className={cn(
                    "rounded-full h-40 w-40 shadow-lg bg-cyan-600/95 hover:bg-cyan-900 text-white flex flex-col items-center justify-center gap-1 transition-transform transform hover:scale-110", 
                    isCalmCornerSuggested && "animate-rainbow-border border-4 border-transparent"
                )}
            >
                <Leaf className="h-8 w-8" />
                <span className="text-xs font-semibold">Calm Corner</span>
            </Button>
        </Link>
      )}

      {/* Alarm Modal */}
      <AlarmModal
        alarm={activeAlarm}
        isOpen={isAlarmActive}
        onClose={dismissAlarm}
        onSnooze={snoozeAlarm}
        isSnoozeEnabled={household?.alarm_snooze_enabled ?? true}
      />
    </div>
  );
};

export default KioskDashboard;