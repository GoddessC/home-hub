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
import { WeatherIcon } from '@/components/dashboard/WeatherIcon';
import { SchedulePanel } from '@/components/dashboard/SchedulePanel';

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
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

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
            <WeatherIcon />
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
      <main className="flex-grow container mx-auto p-4 md:p-8 main-container bottom-right glass-card">
        <div className="flex gap-8">
          {/* Left sidebar with schedule */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <SchedulePanel />
          </div>
          
          {/* Main content */}
          <div className="flex-grow">
            <div className="space-y-8">
              <TeamQuestPanel quest={activeQuest} isLoading={isLoadingQuest} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {isLoadingMembers || isLoadingChores ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={cn("h-48 w-full rounded-lg", isAnonymous && "bg-gray-700")} />)
              ) : (
                members?.map(m => (
                  <MemberDashboardPanel 
                    key={m.id} 
                    member={m} 
                    chores={chores?.filter(c => c.member_id === m.id) || []} 
                  />
                ))
              )}
            </div>
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
    </div>
  );
};

export default KioskDashboard;