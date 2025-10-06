import { useAuth, Member } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Leaf, Shield, Rocket } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MemberDashboardPanel } from '@/components/dashboard/MemberDashboardPanel';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';
import { TeamQuestPanel, Quest } from '@/components/dashboard/TeamQuestPanel';
import { SchedulePanel } from '@/components/dashboard/SchedulePanel';
import { ClockWeatherPanel } from '@/components/dashboard/ClockWeatherPanel';
import { MemberRail } from '@/components/dashboard/MemberRail';
import { MemberDetailsPanel } from '@/components/dashboard/MemberDetailsPanel';
import { TouchLeaderboardPodiumView } from '@/components/dashboard/TouchLeaderboardPodiumView';
// Alarm system disabled for now
// import { AlarmModal } from '@/components/alarms/AlarmModal';
// import { useAlarmSystem } from '@/hooks/useAlarmSystem';
import { MemberAvatar } from '@/components/avatar/MemberAvatar';
import { getMemberAvailablePoints } from '@/utils/pointsUtils';

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

// Component to display member points in the sidebar
const MemberPointsDisplay = ({ memberId }: { memberId: string }) => {
  const { data: availablePoints, isLoading } = useQuery({
    queryKey: ['member_available_points', memberId],
    queryFn: async () => {
      return await getMemberAvailablePoints(memberId);
    },
    enabled: !!memberId,
  });

  if (isLoading) {
    return <Skeleton className="h-4 w-8 bg-primary/50" />;
  }

  return <span>{availablePoints ?? 0} pts</span>;
};

// Animated Circular Progress Border Component
const AnimatedProgressBorder = ({ percentage, children, className }: { 
  percentage: number; 
  children: React.ReactNode; 
  className?: string; 
}) => {
  const circumference = 2 * Math.PI * 45; // radius of 45px
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${className}`}>
      {/* Background circle */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

const KioskDashboard = () => {
  const { device, household, signOut, isAnonymous, member } = useAuth();
  const [isCalmCornerSuggested, setIsCalmCornerSuggested] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isMemberDetailsVisible, setIsMemberDetailsVisible] = useState(false);
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

  // Calculate completion percentage for a member
  const getMemberCompletionPercentage = (memberId: string) => {
    if (!chores) return 0;
    const memberChores = chores.filter(c => c.member_id === memberId);
    if (memberChores.length === 0) return 0;
    const completedChores = memberChores.filter(c => c.completed_at).length;
    return Math.round((completedChores / memberChores.length) * 100);
  };
  
  // Alarm system - disabled for now
  // const { activeAlarm, dismissAlarm, snoozeAlarm, isAlarmActive, testAlarm } = useAlarmSystem();


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

  const { data: chores } = useQuery<ChoreLog[]>({
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

  const { data: activeQuests, isLoading: isLoadingQuests } = useQuery<Quest[]>({
    queryKey: ['active_quests', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('quests')
        .select('id, name, reward_points_each, quest_sub_tasks(*, members(id, full_name))')
        .eq('household_id', household.id)
        .eq('status', 'ACTIVE')
        .is('completed_at', null) // Ensure we only get non-completed quests
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log('Fetched active quests:', data?.length || 0, 'quests:', data);
      console.log('Query filters: household_id=', household.id, 'status=ACTIVE', 'completed_at=null');
      return data || [];
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
    <div className={cn("overflow-hidden min-h-screen dashboardBG", isAnonymous ? "text-white dark" : "")}>
      {/* Top Section - Header */}
      <div className="relative top-0 left-0 right-0">
        <div className="w-3/4 flex justify-between p-8 pt-0">
          <div className="flex gap-8 self-start w-full">
            <h3 className={cn("text-3xl font-bold self-center", isAnonymous ? "" : "text-gray-800")}>
              {household?.name || (isAnonymous ? 'Kiosk Mode' : 'Dashboard')}
            </h3>
            {/* Admin Panel Button */}
            {!isAnonymous && member?.role === 'OWNER' && (
              <Button asChild variant="outline" className="absolute left-8 bottom-1">
                <Link to="/admin">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </Link>
              </Button>
            )}
            <AnnouncementPanel />
          </div>
        </div>
      </div>
      <div className="absolute top-8 right-0">
        <ClockWeatherPanel className="border-r-0 rounded-l-full"/>
      </div>

      {/* Main Content Area - 3 Column Layout */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Left Column - Schedule */}
        <div className="w-1/4 p-4 h-3/4 top-8">
          <SchedulePanel className="h-full overflow-hidden" />
        </div>

        {/* Center Column - Main Content (Larger) */}
        <div className="flex-1 min-w-0">
          <div className="h-full flex flex-col w-3/5">
            <TouchLeaderboardPodiumView
              members={(members || []).map((m) => ({
                id: m.id,
                name: m.full_name,
                // For now, use available points (async) is heavy; use 0 and TODO: hydrate
                points: 0,
                avatarUrl: null,
                updatedAt: new Date().toISOString(),
              }))}
              settings={{ mode: 'family' }}
              onMemberSelect={(m) => {
                setSelectedMemberId(m.id);
                setIsMemberDetailsVisible(true);
              }}
              className="flex-1"
            />
          </div>
        </div>

        {/* Right Column - Clock/Weather + Team Quests */}
        <div className="w-1/4 p-4 absolute right-6 h-[28rem] top-[15rem] scrollbar-width-none ">
          <div className="space-y-4 h-full flex flex-col">
            {/* Team Quests Section */}
            <div className="flex-1 min-h-0">
              <h3 className="text-lg font-semibold mb-3 text-center">Active Team Quests</h3>
              <div className="h-full overflow-y-auto scrollbar-width-none space-y-4 border border-gray-200 rounded-lg">
                {isLoadingQuests ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : activeQuests && activeQuests.length > 0 ? (
                  <>
                    {console.log('Rendering quests:', activeQuests.length, activeQuests)}
                    {activeQuests.map((quest) => (
                      <TeamQuestPanel key={quest.id} quest={quest} isLoading={false} />
                    ))}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Rocket className="h-12 w-12 mb-4 opacity-50" />
                    <p>No active quests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calm Corner - Bottom Right */}
        {household?.is_calm_corner_enabled && (
          <div className="fixed bottom-[-5%] left-[-4%] z-40 w-64 h-64 p-4 shadow-lg flex flex-col bg-[#800000] text-white hover:rounded-full hover:bg-[#e5c69c] transition-colors rounded-full items-center justify-center">
            <Link
              to="/kiosk/calm-corner"
              className="block w-full h-full rounded-full"
              onClick={handleCalmCornerClick}
            >
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full hover:bg-[#e5c69c] rounded-full",
                  isCalmCornerSuggested && "animate-rainbow-border border-4 border-transparent"
                )}
              >
                <Leaf className="h-8 w-8 mb-2"/>
                <span className="text-xs font-semibold text-center">Calm Corner</span>
              </Button>
            </Link>
          </div>
        )}
        {isCalmCornerSuggested && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2">
            <p className="text-yellow-800 text-sm font-medium">
              💡 Calm Corner suggested
            </p>
          </div>
        )}
      </div>

      {/* Member Rail - Always Visible */}
      <div className={cn(
        "fixed bottom-0 right-0 w-4/5 h-48 bg-white z-30"
      )}>

        {/* Member Rail Content */}
        <div className="h-full overflow-hidden">
          {isLoadingMembers ? (
            <div className="flex gap-4 overflow-x-auto px-6 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-22 w-22 rounded-full flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <MemberRail
                members={members || []}
                onMemberSelect={(selectedMember) => {
                  setSelectedMemberId(selectedMember.id);
                  setIsMemberDetailsVisible(true);
                }}
                selectedMemberId={selectedMemberId}
                chores={chores}
              />
            </div>
          )}
        </div>
      </div>

      {/* Kiosk Mode Info */}
      {isAnonymous && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-4">
          <span className="text-sm text-gray-400">{device?.display_name}</span>
          <Button variant="destructive" onClick={signOut}>Exit Kiosk Mode</Button>
        </div>
      )}

      {/* Member Details Panel */}
      <MemberDetailsPanel
        member={members?.find(m => m.id === selectedMemberId) || null}
        isOpen={isMemberDetailsVisible}
        onClose={() => {
          setIsMemberDetailsVisible(false);
          setSelectedMemberId(null);
        }}
        chores={chores?.filter((c) => c.member_id === selectedMemberId) || []}
      />
          
      {/* Alarm system disabled for now */}
    </div>
  );
};

export default KioskDashboard;