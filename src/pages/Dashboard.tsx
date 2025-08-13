import { useAuth, Member } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MemberChoreCard } from '@/components/dashboard/MemberChoreCard';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AnnouncementPanel } from '@/components/dashboard/AnnouncementPanel';
import { Link } from 'react-router-dom';
import { UserNav } from '@/components/layout/UserNav';
import { Shield } from 'lucide-react';

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
  const { household, member } = useAuth();

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
      <header className="p-4 bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {household?.name || 'Dashboard'}
          </h1>
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
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
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