import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Generate daily schedule items from templates for a specific date
 */
export const generateDailyScheduleFromTemplates = async (
  targetDate: string,
  householdId: string
): Promise<void> => {
  const { error } = await supabase.rpc('generate_daily_schedule_from_templates', {
    target_date: targetDate,
    target_household_id: householdId,
  });

  if (error) {
    throw new Error(`Failed to generate schedule: ${error.message}`);
  }
};

/**
 * Generate schedule items from templates for a date range
 */
export const generateScheduleForDateRange = async (
  startDate: string,
  endDate: string,
  householdId: string
): Promise<void> => {
  const { error } = await supabase.rpc('generate_schedule_for_date_range', {
    start_date: startDate,
    end_date: endDate,
    target_household_id: householdId,
  });

  if (error) {
    throw new Error(`Failed to generate schedule: ${error.message}`);
  }
};

/**
 * Generate schedule for the current week
 */
export const generateCurrentWeekSchedule = async (householdId: string): Promise<void> => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday

  await generateScheduleForDateRange(
    format(startOfWeek, 'yyyy-MM-dd'),
    format(endOfWeek, 'yyyy-MM-dd'),
    householdId
  );
};

/**
 * Generate schedule for the next week
 */
export const generateNextWeekSchedule = async (householdId: string): Promise<void> => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const startOfNextWeek = new Date(nextWeek);
  startOfNextWeek.setDate(nextWeek.getDate() - nextWeek.getDay()); // Start from Sunday
  
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // End on Saturday

  await generateScheduleForDateRange(
    format(startOfNextWeek, 'yyyy-MM-dd'),
    format(endOfNextWeek, 'yyyy-MM-dd'),
    householdId
  );
};
