import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Member, useAuth } from '@/context/AuthContext';
import { FeelingsCheckinDialog } from './FeelingsCheckinDialog';
import { format, isToday } from 'date-fns';

const feelingMeta = {
  joyful: { emoji: '😄' },
  happy: { emoji: '😊' },
  okay: { emoji: '😐' },
  sad: { emoji: '😢' },
  worried: { emoji: '😟' },
  angry: { emoji: '😠' },
};

interface FeelingsPanelProps {
  member: Member;
}

export const FeelingsPanel = ({ member }: FeelingsPanelProps) => {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { household } = useAuth();

  const { data: lastLog } = useQuery({
    queryKey: ['last_feeling_log', member.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feelings_log')
        .select('feeling, created_at')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!member,
  });

  if (!household?.is_feelings_enabled) {
    return null;
  }

  const lastLogIsToday = lastLog && isToday(new Date(lastLog.created_at));
  const lastFeelingEmoji = lastLogIsToday ? feelingMeta[lastLog.feeling as keyof typeof feelingMeta]?.emoji : null;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Feelings Check-in</CardTitle>
          <CardDescription>How are you feeling, {member.full_name}?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          {lastFeelingEmoji && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">You last felt:</p>
              <p className="text-6xl">{lastFeelingEmoji}</p>
            </div>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            {lastLogIsToday ? 'Check-in Again' : 'Log My Feeling'}
          </Button>
        </CardContent>
      </Card>
      <FeelingsCheckinDialog
        isOpen={isDialogOpen}
        setOpen={setDialogOpen}
        member={member}
      />
    </>
  );
};