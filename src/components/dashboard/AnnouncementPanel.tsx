import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone } from 'lucide-react';

export const AnnouncementPanel = () => {
  const { household } = useAuth();

  const { data: announcement, isLoading } = useQuery({
    queryKey: ['active_announcement', household?.id],
    queryFn: async () => {
      if (!household?.id) return null;
      const { data, error } = await supabase
        .from('announcements')
        .select('message')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      return data;
    },
    enabled: !!household?.id,
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!announcement) {
    return null; // Don't render anything if there's no announcement
  }

  return (
    <Card className="w-2/3  ">
      <CardContent className="flex items-start space-x-4 p-4">
        <Megaphone className="h-6 w-6 flex-shrink-0 " />
        <div>
            <h3 className="font-bold text-red-500 float-left">Announcement:</h3>
            <p className="text-red-500 float-right">&nbsp; {announcement.message}</p>
        </div>
      </CardContent>
    </Card>
  );
};