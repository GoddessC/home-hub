import { useAuth } from '@/context/AuthContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Member } from '@/context/AuthContext';
import { MemberChoreCard } from '@/components/dashboard/MemberChoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

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
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default KioskDashboard;