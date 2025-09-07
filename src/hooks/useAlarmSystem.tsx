import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Alarm } from '@/components/alarms/AlarmModal';

interface SnoozedAlarm {
  alarmId: string;
  snoozeUntil: Date;
}

export const useAlarmSystem = () => {
  const { household } = useAuth();
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [snoozedAlarms, setSnoozedAlarms] = useState<SnoozedAlarm[]>([]);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Check if snooze is enabled
  const isSnoozeEnabled = household?.alarm_snooze_enabled ?? true;

  // Fetch active alarms for the household
  const { data: alarms = [] } = useQuery<Alarm[]>({
    queryKey: ['alarms', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('time');
      if (error) throw error;
      console.log('Loaded alarms:', data);
      return data;
    },
    enabled: !!household?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Check for alarms that should trigger
  const checkForAlarms = useCallback(() => {
    if (!alarms.length || activeAlarm) return;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.getDay();

    // Check for new alarms that should trigger
    const triggeredAlarm = alarms.find(alarm => {
      // Check if alarm should trigger today
      const shouldTriggerToday = alarm.days_of_week?.includes(currentDay) ?? false;
      if (!shouldTriggerToday) return false;

      // Check if time matches (within 1 minute tolerance)
      const alarmTime = alarm.time.slice(0, 5); // Remove seconds if present
      const timeDiff = Math.abs(
        new Date(`2000-01-01T${alarmTime}:00`).getTime() - 
        new Date(`2000-01-01T${currentTime}:00`).getTime()
      );
      
      return timeDiff <= 60000; // 1 minute tolerance
    });

    if (triggeredAlarm) {
      console.log('Alarm triggered:', triggeredAlarm.name, 'at', currentTime);
      setActiveAlarm(triggeredAlarm);
    }
  }, [alarms, activeAlarm]);

  // Set up alarm checking interval
  useEffect(() => {
    if (!household?.id || !alarms.length) return;

    // Set up interval to check every 30 seconds
    checkInterval.current = setInterval(checkForAlarms, 30000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [household?.id, alarms.length, checkForAlarms]);

  // Check for snoozed alarms that are ready to ring again
  useEffect(() => {
    if (!snoozedAlarms.length || activeAlarm) return;

    const now = new Date();
    const readySnoozedAlarm = snoozedAlarms.find(
      snoozed => snoozed.snoozeUntil <= now
    );

    if (readySnoozedAlarm) {
      const alarm = alarms.find(a => a.id === readySnoozedAlarm.alarmId);
      if (alarm) {
        setActiveAlarm(alarm);
        setSnoozedAlarms(prev => prev.filter(s => s.alarmId !== readySnoozedAlarm.alarmId));
      }
    }
  }, [snoozedAlarms, activeAlarm, alarms]);

  // Handle alarm dismissal
  const dismissAlarm = useCallback(() => {
    console.log('Alarm dismissed');
    setActiveAlarm(null);
  }, []);

  // Handle alarm snooze
  const snoozeAlarm = useCallback((alarmId: string, _snoozeMinutes: number) => {
    if (!isSnoozeEnabled) {
      console.log('Snooze is disabled, dismissing alarm instead');
      setActiveAlarm(null);
      return;
    }
    
    console.log('Alarm snoozed for exactly 5 minutes');
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + 5); // Always 5 minutes regardless of alarm setting
    
    setSnoozedAlarms(prev => [
      ...prev.filter(s => s.alarmId !== alarmId),
      { alarmId, snoozeUntil }
    ]);
    setActiveAlarm(null);
  }, [isSnoozeEnabled]);

  return {
    activeAlarm,
    dismissAlarm,
    snoozeAlarm,
    isAlarmActive: !!activeAlarm,
  };
};
