import { supabase } from '@/integrations/supabase/client';

/**
 * Get member's total points earned from all completed chores
 */
export const getMemberTotalPoints = async (memberId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('chore_log')
    .select('chores(points)')
    .eq('member_id', memberId)
    .not('completed_at', 'is', null);
  
  if (error) throw error;
  
  return data.reduce((acc, item: any) => 
    acc + (Array.isArray(item.chores) ? item.chores[0]?.points : item.chores?.points || 0), 0
  );
};

/**
 * Get member's weekly points earned from completed chores this week
 */
export const getMemberWeeklyPoints = async (memberId: string, weekStartsOn: number = 0): Promise<number> => {
  const { format, startOfWeek, endOfWeek } = await import('date-fns');
  
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: weekStartsOn as any }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: weekStartsOn as any }), 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('chore_log')
    .select('chores(points)')
    .eq('member_id', memberId)
    .not('completed_at', 'is', null)
    .gte('due_date', weekStart)
    .lte('due_date', weekEnd);
  
  if (error) throw error;
  
  return data.reduce((acc, item: any) => 
    acc + (Array.isArray(item.chores) ? item.chores[0]?.points : item.chores?.points || 0), 0
  );
};

/**
 * Get member's available points (total earned - total spent)
 * This should match what's shown in the store
 */
export const getMemberAvailablePoints = async (memberId: string): Promise<number> => {
  try {
    // Try to use the database function first
    const { data, error } = await supabase.rpc('get_member_available_points', { p_member_id: memberId });
    if (!error && data !== null) return data;
  } catch (error) {
    console.warn('get_member_available_points function not available, calculating manually');
  }
  
  // Fallback: calculate manually
  let totalEarned = 0;
  let totalSpent = 0;
  
  try {
    // Get total points earned from completed chores
    const { data: choreData, error: choreError } = await supabase
      .from('chore_log')
      .select('chores(points)')
      .eq('member_id', memberId)
      .not('completed_at', 'is', null);
    
    if (choreError) {
      console.error('Error fetching chore data:', choreError);
    } else {
      totalEarned = (choreData || []).reduce((acc, item: any) => 
        acc + (Array.isArray(item.chores) ? item.chores[0]?.points : item.chores?.points || 0), 0
      );
    }
  } catch (error) {
    console.error('Error calculating total earned points:', error);
  }
  
  try {
    // Get total spent on avatar items
    const { data: purchases, error: purchaseError } = await supabase
      .from('member_avatar_inventory')
      .select('avatar_items(point_cost)')
      .eq('member_id', memberId);
    
    if (purchaseError) {
      console.error('Error fetching purchase data:', purchaseError);
    } else {
      totalSpent = (purchases || []).reduce((acc, item: any) => 
        acc + (item.avatar_items?.point_cost || 0), 0
      );
    }
  } catch (error) {
    console.error('Error calculating total spent points:', error);
  }
  
  return Math.max(0, totalEarned - totalSpent);
};

/**
 * Get member's total spent points on avatar items
 */
export const getMemberSpentPoints = async (memberId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('member_avatar_inventory')
    .select('avatar_items(point_cost)')
    .eq('member_id', memberId);
  
  if (error) throw error;
  
  return data.reduce((acc, item: any) => 
    acc + (item.avatar_items?.point_cost || 0), 0
  );
};
