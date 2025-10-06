import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const feelingMeta = {
  joyful: { color: 'bg-yellow-300', emoji: '😄' },
  happy: { color: 'bg-green-400', emoji: '😊' },
  okay: { color: 'bg-gray-300', emoji: '😐' },
  sad: { color: 'bg-blue-400', emoji: '😢' },
  worried: { color: 'bg-purple-400', emoji: '😟' },
  angry: { color: 'bg-red-400', emoji: '😠' },
};

const contextMeta = {
    school: { emoji: '🏫', text: 'School' },
    friends: { emoji: '🧑‍🤝‍🧑', text: 'Friends' },
    family: { emoji: '👨‍👩‍👧‍👦', text: 'Family' },
    hobbies: { emoji: '⚽️', text: 'Hobbies' },
    chores: { emoji: '🧹', text: 'Chores' },
    sleep: { emoji: '😴', text: 'Sleep' },
    unknown: { emoji: '🤷', text: "I don't know" },
    other: { emoji: '❓', text: 'Something else' },
};

type FeelingLog = {
  id: string;
  created_at: string;
  feeling: keyof typeof feelingMeta;
  context: keyof typeof contextMeta | null;
  // FIX: Changed type to handle cases where Supabase returns a single related record as an array.
  members: { full_name: string } | { full_name: string }[] | null;
};

export const FeelingsChart = () => {
  const { household } = useAuth();
  const [month, setMonth] = useState(new Date());

  const { data: logs, isLoading } = useQuery({
    queryKey: ['feelings_log', household?.id, format(month, 'yyyy-MM')],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('feelings_log')
        .select('id, created_at, feeling, context, members(full_name)')
        .eq('household_id', household.id)
        .gte('created_at', format(startOfMonth(month), 'yyyy-MM-dd'))
        .lte('created_at', format(endOfMonth(month), 'yyyy-MM-dd'));
      if (error) throw error;
      return data as FeelingLog[];
    },
    enabled: !!household?.id,
  });

  const logsByDay = logs?.reduce((acc, log) => {
    try {
      const date = new Date(log.created_at);
      // Only process valid dates
      if (isNaN(date.getTime())) {
        console.warn('Invalid date found in feeling log:', log.created_at);
        return acc;
      }
      const day = format(date, 'yyyy-MM-dd');
      if (!acc[day]) acc[day] = [];
      acc[day].push(log);
    } catch (error) {
      console.warn('Error processing date in feeling log:', log.created_at, error);
    }
    return acc;
  }, {} as Record<string, FeelingLog[]>) || {};

  const DayComponent: React.FC<any> = ({ day, date, modifiers, ...buttonProps }: any) => {
    // Handle undefined or null dates (shouldn't occur with react-day-picker)
    const raw = day ?? date;
    if (!raw) {
      return null;
    }
    
    // Convert to Date object if it's not already one
    let dateObj: Date;
    if (raw instanceof Date) {
      dateObj = raw;
    } else if (typeof raw === 'string' || typeof raw === 'number') {
      dateObj = new Date(raw);
    } else {
      return null;
    }
    
    // Safety check for invalid dates
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    const dayKey = format(dateObj, 'yyyy-MM-dd');
    const dayLogs = logsByDay[dayKey];
    const isCurrentMonth = dateObj.getMonth() === month.getMonth();

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            {...buttonProps}
            className={cn(
              "h-9 w-9 p-0 font-normal relative flex items-center justify-center cursor-pointer",
              !isCurrentMonth && "text-muted-foreground opacity-50",
              buttonProps?.className
            )}
          >
            {dayLogs && dayLogs.length > 0 && isCurrentMonth && (
              <div className="absolute inset-0.5 flex overflow-hidden rounded-md">
                {dayLogs.map((log) => (
                  <div
                    key={log.id}
                    className={cn("h-full", feelingMeta[log.feeling]?.color || 'bg-gray-200')}
                    style={{ width: `${100 / dayLogs.length}%` }}
                  />
                ))}
              </div>
            )}
            <span className="relative text-sm z-10">{dateObj.getDate()}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <h4 className="font-bold mb-2">{format(dateObj, 'PPP')}</h4>
          {dayLogs && dayLogs.length > 0 ? (
            <ul className="space-y-2">
              {dayLogs.map(log => {
                const member = Array.isArray(log.members) ? log.members[0] : log.members;
                return (
                  <li key={log.id} className="text-sm">
                    <strong>{member?.full_name}:</strong> {feelingMeta[log.feeling]?.emoji} {log.feeling}
                    {log.context && ` (About: ${contextMeta[log.context]?.emoji} ${contextMeta[log.context]?.text})`}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No feelings logged for this day.</p>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Calendar
      mode="single"
      month={month}
      onMonthChange={setMonth}
      className="rounded-md border p-3"
      components={{ Day: DayComponent as any }}
      showOutsideDays={true}
    />
  );
};