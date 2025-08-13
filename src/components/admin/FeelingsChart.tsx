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
  members: { full_name: string } | null;
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
    const day = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {} as Record<string, FeelingLog[]>) || {};

  const DayComponent = ({ date, ...props }: { date: Date, [key: string]: any }) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const dayLogs = logsByDay[dayKey];

    if (!dayLogs) {
      return <div {...props} />;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative w-full h-full flex items-center justify-center cursor-pointer">
            <div className="absolute inset-0.5 flex overflow-hidden rounded-md">
              {dayLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={cn("h-full", feelingMeta[log.feeling]?.color || 'bg-gray-200')}
                  style={{ width: `${100 / dayLogs.length}%` }}
                />
              ))}
            </div>
            <span className="relative text-sm z-10">{date.getDate()}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent>
            <h4 className="font-bold mb-2">{format(date, 'PPP')}</h4>
            <ul className="space-y-2">
                {dayLogs.map(log => (
                    <li key={log.id} className="text-sm">
                        <strong>{log.members?.full_name}:</strong> {feelingMeta[log.feeling]?.emoji} {log.feeling}
                        {log.context && ` (About: ${contextMeta[log.context]?.emoji} ${contextMeta[log.context]?.text})`}
                    </li>
                ))}
            </ul>
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
      components={{ Day: DayComponent }}
    />
  );
};