import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type ScheduleItem = {
  id: string;
  time: string; // Keep for backward compatibility
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  scheduled_date: string;
};

interface SchedulePanelProps {
  className?: string;
}

export const SchedulePanel = ({ className }: SchedulePanelProps) => {
  const { household } = useAuth();

  const { data: todaysSchedule, isLoading } = useQuery<ScheduleItem[]>({
    queryKey: ['schedule', household?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!household?.id) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('household_id', household.id)
        .eq('scheduled_date', today)
        .order('start_time');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });


  const getCurrentTime = () => {
    const now = new Date();
    return now.getHours() * 100 + now.getMinutes();
  };

  const isUpcoming = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const scheduleMinutes = hours * 100 + minutes;
    return scheduleMinutes >= getCurrentTime();
  };

  const isCurrent = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startScheduleMinutes = startHours * 100 + startMinutes;
    const endScheduleMinutes = endHours * 100 + endMinutes;
    const currentMinutes = getCurrentTime();
    return startScheduleMinutes <= currentMinutes && currentMinutes < endScheduleMinutes;
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Schedule Loading */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!todaysSchedule || todaysSchedule.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Empty Schedule */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between text-center">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            {/* <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateCurrentWeekMutation.mutate()}
                disabled={generateCurrentWeekMutation.isPending}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateNextWeekMutation.mutate()}
                disabled={generateNextWeekMutation.isPending}
                className="flex items-center gap-1"
              >
                <Calendar className="h-3 w-3" />
                Next Week
              </Button>
 x           </div> */}
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                No schedule items for today.
              </p>
              <p className="text-xs text-muted-foreground">
                Generate a schedule from your templates using the buttons above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Schedule */}
      <Card className="w-full border-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
          {/* <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateCurrentWeekMutation.mutate()}
              disabled={generateCurrentWeekMutation.isPending}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateNextWeekMutation.mutate()}
              disabled={generateNextWeekMutation.isPending}
              className="flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              Next Week
            </Button>
          </div> */}
        </CardHeader>
        <CardContent>
        <div className="space-y-3 border-t-[1px] border-gray-200 overflow-y-scroll">
          {todaysSchedule.map((item) => {
            // Use start_time and end_time if available, fallback to time for backward compatibility
            const startTime = item.start_time || item.time;
            const endTime = item.end_time || item.time;
            
            const upcoming = isUpcoming(startTime);
            const current = isCurrent(startTime, endTime);
            
            return (
              <div
                key={item.id}
                className={cn(
                  "p-3 transition-all duration-200",
                  current && "bg-blue-50 border-blue-200 shadow-md",
                  !current && !upcoming && "bg-gray-50 border-gray-200 opacity-60",
                  upcoming && !current && "bg-white border-gray-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-2 h-2 rounded-full mt-2",
                    current && "bg-blue-500",
                    !current && !upcoming && "bg-gray-400",
                    upcoming && !current && "bg-green-500"
                  )}><hr className='h-[5rem] w-[1px] relative top-2 left-[3.2px] bg-gray-200'/></div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {startTime === endTime ? startTime : `${startTime} - ${endTime}`}
                      </span>
                      {current && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Now
                        </span>
                      )}
                      {upcoming && !current && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </CardContent>
      </Card>
    </div>
  );
};
