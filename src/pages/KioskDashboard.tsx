import { useAuth, Member } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';
import { Link } from 'react-router-dom';
import { Leaf, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { UserNav } from '@/components/layout/UserNav';
import { MemberDashboardPanel } from '@/components/dashboard/MemberDashboardPanel';
import { TeamQuestPanel, Quest } from '@/components/dashboard/TeamQuestPanel';

// FIX: Changed type to handle cases where Supabase returns a single related record as an array.
// Exporting the type so it can be used in MemberDashboardPanel.
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
  const [isPulsing, setIsPulsing] = useState(false);

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
            setIsPulsing(true);
            const audio = new Audio('/ding.mp3');
            audio.play().catch(e => console.error("Could not play audio:", e));
            
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
      // This RPC function creates chore logs for today if they don't exist,
      // and then returns all logs for today (both recurring and manually assigned).
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

  return (
    <div className={cn("flex flex-col min-h-screen", isAnonymous ? "bg-gray-900 text-white dark" : "bg-gray-50")}>
      <header className={cn("p-4 sticky top-0 z-40", isAnonymous ? "bg-gray-800 shadow-md" : "bg-white shadow-sm")}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className={cn("text-2xl font-bold", isAnonymous ? "" : "text-gray-800")}>
            {household?.name || (isAnonymous ? 'Kiosk Mode' : 'Dashboard')}
          </h1>
          {isAnonymous ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">{device?.display_name}</span>
              <Button variant="destructive" onClick={signOut}>Exit Kiosk Mode</Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              {member?.role === 'OWNER' && (
                <Button asChild variant="outline">
                  <Link to="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              <UserNav />
            </div>
          )}
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="space-y-8">
          <TeamQuestPanel quest={activeQuest} isLoading={isLoadingQuest} />
          <AnnouncementPanel />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
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
      </main>
 
      {household?.is_calm_corner_enabled && (
        <Link to="/kiosk/calm-corner" className="fixed bottom-8 right-8">
            <Button 
                variant="secondary" 
                size="lg" 
                className={cn(
                    "rounded-full h-20 w-20 shadow-lg bg-green-500 hover:bg-green-600 text-white flex flex-col items-center justify-center gap-1 transition-transform transform hover:scale-110", 
                    isPulsing && "animate-pulse"
                )}
                onClick={() => setIsPulsing(false)}
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