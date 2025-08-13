import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { Member, useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const feelings = {
  joyful: { emoji: '😄', text: 'Joyful', color: 'bg-yellow-300 hover:bg-yellow-400' },
  happy: { emoji: '😊', text: 'Happy', color: 'bg-green-300 hover:bg-green-400' },
  okay: { emoji: '😐', text: 'Okay', color: 'bg-gray-300 hover:bg-gray-400' },
  sad: { emoji: '😢', text: 'Sad', color: 'bg-blue-300 hover:bg-blue-400' },
  worried: { emoji: '😟', text: 'Worried', color: 'bg-purple-300 hover:bg-purple-400' },
  angry: { emoji: '😠', text: 'Angry', color: 'bg-red-300 hover:bg-red-400' },
};

const contexts = {
    school: { emoji: '🏫', text: 'School' },
    friends: { emoji: '🧑‍🤝‍🧑', text: 'Friends' },
    family: { emoji: '👨‍👩‍👧‍👦', text: 'Family' },
    hobbies: { emoji: '⚽️', text: 'Hobbies' },
    chores: { emoji: '🧹', text: 'Chores' },
    sleep: { emoji: '😴', text: 'Sleep' },
    unknown: { emoji: '🤷', text: "I don't know" },
    other: { emoji: '❓', text: 'Something else' },
};

interface FeelingsCheckinDialogProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  member: Member;
}

export const FeelingsCheckinDialog = ({ isOpen, setOpen, member }: FeelingsCheckinDialogProps) => {
  const { household } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ feeling, context }: { feeling: string; context: string | null }) => {
      if (!household) throw new Error("Household not found");
      const { data, error } = await supabase.from('feelings_log').insert({
        household_id: household.id,
        member_id: member.id,
        feeling,
        context,
      }).select('feeling, created_at').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newLog) => {
      if (!newLog) return;
      // Manually update the query cache for an instant UI change
      queryClient.setQueryData(['todays_feeling_logs', member.id], (oldData: any[] | undefined) => {
        const newLogs = oldData ? [newLog, ...oldData] : [newLog];
        return newLogs;
      });

      setStep(3); // Move to confirmation step
      setTimeout(() => {
        handleClose();
      }, 2000);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFeelingSelect = (feeling: string) => {
    setSelectedFeeling(feeling);
    setStep(2);
  };

  const handleContextSelect = (context: string | null) => {
    if (!selectedFeeling) return;
    mutation.mutate({ feeling: selectedFeeling, context });
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
        setStep(1);
        setSelectedFeeling(null);
    }, 300); // Delay reset to allow for closing animation
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>How are you feeling right now, {member.full_name}?</DialogTitle>
              <DialogDescription>Pick the one that feels most true.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              {Object.entries(feelings).map(([key, { emoji, text, color }]) => (
                <Button key={key} variant="outline" className={cn("h-24 flex-col gap-2 text-lg", color)} onClick={() => handleFeelingSelect(key)}>
                  <span className="text-4xl">{emoji}</span>
                  <span>{text}</span>
                </Button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>What's making you feel this way?</DialogTitle>
              <DialogDescription>You can pick one, or skip this step.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
              {Object.entries(contexts).map(([key, { emoji, text }]) => (
                <Button key={key} variant="outline" className="h-24 flex-col gap-2" onClick={() => handleContextSelect(key)}>
                  <span className="text-4xl">{emoji}</span>
                  <span className="text-center text-xs">{text}</span>
                </Button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => handleContextSelect(null)}>Skip for now</Button>
          </>
        )}
        {step === 3 && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h2 className="text-2xl font-bold">Thanks for sharing!</h2>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};