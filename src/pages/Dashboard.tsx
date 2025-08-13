import { useAuth } from '@/context/AuthContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { UserNav } from '@/components/layout/UserNav';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Member } from '@/context/AuthContext';
import { MemberChoreCard } from '@/components/dashboard/MemberChoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';

type ChoreLog = {
  id: string;
  completed_at: string | null;
  member_id: string;
  chores: {
    title: string;
    points: number;
  } | null;
};

const Dashboard = () => {
  const { user, household, profile, member } = useAuth();

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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            <Link to="/">{household?.name || 'HomeHub'}</Link>
          </h1>
          <div className="flex items-center space-x-4">
            {member?.role === 'OWNER' && (
              <Button asChild variant="secondary">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            )}
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="text-left mb-8">
            <h2 className="text-4xl font-bold">Welcome, {profile?.full_name || user?.email}</h2>
            <p className="text-gray-600 mt-2">Here's what's happening in your household today.</p>
        </div>

        <div className="mb-8">
          <AnnouncementPanel />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingMembers || isLoadingChores ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
          ) : (
            members?.map(m => {
              const memberChores = chores?.filter(c => c.member_id === m.id) || [];
              return <MemberChoreCard key={m.id} member={m} chores={memberChores} />
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;