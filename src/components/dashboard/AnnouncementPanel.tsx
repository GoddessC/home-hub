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
    <Card className="w-2/3 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
      <CardContent className="p-4 flex items-start space-x-4">
        <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
        <div>
            {/* <h3 className="font-bold text-blue-800 mr-4 dark:text-blue-300 float-left">Announcement:</h3> */}
            <p className="text-blue-700 dark:text-blue-300/90 float-right">{announcement.message}</p>
        </div>
      </CardContent>
    </Card>
  );
};