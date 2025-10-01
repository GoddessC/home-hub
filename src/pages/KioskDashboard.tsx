import { useAuth, Member } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';
import { Link } from 'react-router-dom';
import { Leaf, Shield, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MemberDashboardPanel } from '@/components/dashboard/MemberDashboardPanel';
import { TeamQuestPanel, Quest } from '@/components/dashboard/TeamQuestPanel';
import { SchedulePanel } from '@/components/dashboard/SchedulePanel';
import { ClockWeatherPanel } from '@/components/dashboard/ClockWeatherPanel';
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
  const [headerTime, setHeaderTime] = useState(new Date());
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
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
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
    <div className={cn("min-h-screen dashboardBG", isAnonymous ? "text-white dark" : "")}>
      {/* Top Section - Calm Corner + Header */}
      <div className="flex">
        {/* Calm Corner - Top Left */}
        <div className="w-1/4">
          <div className="bg-white border-t-0 border-l-0 border-r border-b border-gray-200 rounded-bl-2xl rounded-br-2xl p-4 h-32">
            {household?.is_calm_corner_enabled && (
              <Link to="/kiosk/calm-corner" className="block h-full" onClick={handleCalmCornerClick}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center hover:bg-gray-50 transition-colors",
                    isCalmCornerSuggested && "animate-rainbow-border border-4 border-transparent"
                  )}
                >
                  <Leaf className="h-8 w-8 mb-2" />
                  <span className="text-xs font-semibold">Calm Corner</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Header - Top Right */}
        <div className="flex-1 flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            {isCalmCornerSuggested && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2">
                <p className="text-yellow-800 text-sm font-medium">
                  💡 Calm Corner suggested
                </p>
              </div>
            )}
          </div>
          <AnnouncementPanel />
          <div className="flex items-center gap-2">
            
            <h3 className={cn("text-3xl font-bold", isAnonymous ? "" : "text-gray-800")}>
              {household?.name || (isAnonymous ? 'Kiosk Mode' : 'Dashboard')}
            </h3>
            {/* <div className={cn("font-mono font-semibold", isAnonymous ? "text-white" : "text-gray-800")}>
              {format(headerTime, 'h:mm a')}
            </div> */}
          </div>
        </div>
      </div>

      {/* Main Content Area - 3 Column Layout */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Left Column - Schedule */}
        <div className="w-1/4 p-4">
          <SchedulePanel />
        </div>

        {/* Center Column - Main Content (Larger) */}
        <div className="flex-1 p-4 min-w-0">
          <div className="h-full flex flex-col">
            
          </div>
        </div>

        {/* Right Column - Clock/Weather + Team Quests */}
        <div className="w-1/4 p-4">
          <div className="space-y-4">
            <ClockWeatherPanel />
            <TeamQuestPanel quest={activeQuest} isLoading={isLoadingQuest} />
          </div>
        </div>
      </div>

      {/* Member Row - Bottom Full Width */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
        <div className="flex gap-4 overflow-x-auto pb-2 items-center justify-center">
          {isLoadingMembers ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-32 rounded-lg flex-shrink-0" />
            ))
          ) : (
            members?.map((m) => {
              const completionPercentage = getMemberCompletionPercentage(m.id);
              return (
                <AnimatedProgressBorder
                  key={m.id}
                  percentage={completionPercentage}
                  className="flex-shrink-0"
                >
                  <button
                    onClick={() => {
                      const newSelectedId = selectedMemberId === m.id ? null : m.id;
                      setSelectedMemberId(newSelectedId);
                      setIsMemberDetailsVisible(!!newSelectedId);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all duration-300 relative w-full h-full",
                      selectedMemberId === m.id 
                        ? "bg-primary/10 scale-110 transform" 
                        : "bg-background/70 hover:bg-accent hover:scale-105"
                    )}
                    style={{ minWidth: '120px', minHeight: '120px' }}
                  >
                    <MemberAvatar memberId={m.id} className="w-12 h-16" />
                    <div className="font-medium text-sm truncate w-full">{m.full_name}</div>
                    {/* Points display */}
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-bold">
                      <MemberPointsDisplay memberId={m.id} />
                    </div>
                      {/* Completion percentage
                      <div className="absolute bottom-1 left-1 bg-white/90 text-gray-700 rounded-full px-2 py-1 text-xs font-bold">
                        {completionPercentage}%
                      </div> */}
                  </button>
                </AnimatedProgressBorder>
              );
            })
          )}
        </div>
        {isAnonymous ? (
              <>
                <span className="text-sm text-gray-400">{device?.display_name}</span>
                <Button variant="destructive" onClick={signOut}>Exit Kiosk Mode</Button>
              </>
            ) : (
              member?.role === 'OWNER' && (
                <Button asChild variant="outline" className="absolute left-6 bottom-8">
                  <Link to="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                </Button>
              )
            )}
      </div>

      {/* Backdrop */}
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 bg-black/20 z-30 transition-opacity duration-500 ease-out",
          isMemberDetailsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ height: 'calc(100vh - 120px)', bottom: '120px' }}
        onClick={() => {
          setIsMemberDetailsVisible(false);
          setSelectedMemberId(null);
        }}
      />

      {/* Member Details Card - Slide Up Animation */}
      <div className={cn(
        "fixed left-0 right-0 bg-white border-t border-gray-200 z-40 transition-all duration-500 ease-out",
        isMemberDetailsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )} style={{ 
        height: 'calc(100vh - 120px)', // Full height minus member row height
        bottom: '120px', // Position above the member row
        pointerEvents: isMemberDetailsVisible ? 'auto' : 'none'
      }}>
        {/* Member Name Header */}
        <div className="bg-primary text-primary-foreground p-4 text-center relative">
          <h2 className="text-2xl font-bold">
            {members?.find(m => m.id === selectedMemberId)?.full_name}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsMemberDetailsVisible(false);
              setSelectedMemberId(null);
            }}
            className="absolute top-4 right-4 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Member Details */}
        <div className="flex-1 p-4 overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
          {(() => {
            const selected = members?.find((m) => m.id === selectedMemberId) ?? null;
            if (!selected) return null;
            return (
              <MemberDashboardPanel
                key={selected.id}
                member={selected}
                chores={chores?.filter((c) => c.member_id === selected.id) || []}
                isExpanded={true}
                onToggleExpanded={() => {}}
              />
            );
          })()}
        </div>
      </div>
          
      {/* Alarm system disabled for now */}
    </div>
  );
};

export default KioskDashboard;