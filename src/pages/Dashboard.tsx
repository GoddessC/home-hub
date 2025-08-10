import { useAuth } from '@/context/AuthContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChoreList } from '@/components/chores/ChoreList';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TodaysAlarms, Alarm } from '@/components/alarms/TodaysAlarms';
import { UserNav } from '@/components/layout/UserNav';
import { Link } from 'react-router-dom';
import { AnnouncementPanel } from '@/components/announcements/AnnouncementPanel';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [triggeredAlarms, setTriggeredAlarms] = useState<Record<string, string>>({});

  const { data: chores, isLoading: isLoadingChores } = useQuery({
    queryKey: ['chores', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chores')
        .select('*, profiles(full_name, avatar_url)')
        .eq('assigned_to', user.id)
        .order('is_completed')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: alarms, isLoading: isLoadingAlarms } = useQuery<Alarm[]>({
    queryKey: ['activeAlarms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: announcement, isLoading: isLoadingAnnouncement } = useQuery({
    queryKey: ['latestAnnouncement', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!alarms || alarms.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const currentDay = now.getDay();

      alarms.forEach((alarm) => {
        const isToday = alarm.days_of_week?.includes(currentDay);
        const hasBeenTriggeredThisMinute = triggeredAlarms[alarm.id] === currentTime;

        if (alarm.time === currentTime && isToday && !hasBeenTriggeredThisMinute) {
          toast.info(`⏰ ${alarm.name}`, {
            duration: 15000,
            description: `It's time for your scheduled alarm!`,
          });
          setTriggeredAlarms(prev => ({
            ...prev,
            [alarm.id]: currentTime,
          }));
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, triggeredAlarms]);

  const updateChoreMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase.from('chores').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showSuccess('Chore updated!');
    },
    onError: (error) => {
      showError(`Failed to update chore: ${error.message}`);
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            <Link to="/">HomeHub</Link>
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="font-bold text-primary">{profile?.points ?? 0} Points</span>
            </div>
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <AnnouncementPanel announcement={announcement} isLoading={isLoadingAnnouncement} />
            <h2 className="text-3xl font-bold">My Chores</h2>
            {isLoadingChores ? (
               <Card>
                <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ) : (
              <ChoreList 
                chores={chores || []} 
                onUpdateChore={(id, updates) => updateChoreMutation.mutate({ id, updates })}
                onDeleteChore={() => { /* Non-admins can't delete */ }}
              />
            )}
          </div>
          <div className="space-y-6">
            {isLoadingAlarms ? (
              <Card>
                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </CardContent>
              </Card>
            ) : (
              <TodaysAlarms alarms={alarms || []} />
            )}
          </div>
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;