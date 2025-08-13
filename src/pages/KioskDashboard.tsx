import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Member } from '@/context/AuthContext';
import { MemberChoreCard } from '@/components/dashboard/MemberChoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ChoreLog = {
  id: string;
  completed_at: string | null;
  member_id: string;
  chores: {
    title: string;
    points: number;
  } | null;
};

const KioskDashboard = () => {
  const { device, household, signOut } = useAuth();
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (!household) return;

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
            // Acknowledge the suggestion so it doesn't pulse forever
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
  }, [household]);

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
    queryKey: ['chore_log', household?.id, 'today'],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('chore_log')
        .select('id, member_id, completed_at, chores(title, points)')
        .eq('household_id', household.id)
        .eq('due_date', format(new Date(), 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {household?.name || 'Kiosk Mode'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">{device?.display_name}</span>
            <Button variant="destructive" onClick={signOut}>Exit Kiosk Mode</Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <AnnouncementPanel />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingMembers || isLoadingChores ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full bg-gray-700" />)
          ) : (
            members?.map(m => {
              const memberChores = chores?.filter(c => c.member_id === m.id) || [];
              return <MemberChoreCard key={m.id} member={m} chores={memberChores} />
            })
          )}
        </div>

        <Button variant="secondary" size="lg" className={cn("rounded-full h-16 w-16 shadow-lg bg-green-500 hover:bg-green-600 text-white", isPulsing && "animate-pulse")}>
                yes
            </Button>
      </main>
 
            
        
    </div>
  );
};

export default KioskDashboard;