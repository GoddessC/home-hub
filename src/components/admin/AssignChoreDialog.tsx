import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const assignChoreSchema = z.object({
  choreId: z.string().uuid('Please select a chore.'),
  dueDate: z.date({ required_error: 'A due date is required.' }),
});

type AssignChoreValues = z.infer<typeof assignChoreSchema>;

interface AssignChoreDialogProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  member: { id: string; full_name: string | null };
}

export const AssignChoreDialog = ({ isOpen, setOpen, member }: AssignChoreDialogProps) => {
  const { household } = useAuth();
  const queryClient = useQueryClient();
  const { handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AssignChoreValues>({
    resolver: zodResolver(assignChoreSchema),
    defaultValues: { dueDate: new Date() }
  });
  const dueDate = watch('dueDate');

  const { data: choreTemplates, isLoading } = useQuery({
    queryKey: ['chore_templates', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('chores').select('*').eq('household_id', household.id);
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const assignMutation = useMutation({
    mutationFn: async (values: AssignChoreValues) => {
      if (!household) throw new Error('Household not found');
      const { error } = await supabase.from('chore_log').insert({
        household_id: household.id,
        chore_id: values.choreId,
        member_id: member.id,
        due_date: format(values.dueDate, 'yyyy-MM-dd'),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Chore assigned!');
      queryClient.invalidateQueries({ queryKey: ['chore_log'] });
      queryClient.invalidateQueries({ queryKey: ['my_chores'] });
      setOpen(false);
    },
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Chore to {member.full_name}</DialogTitle>
          <DialogDescription>Select a chore and a due date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(data => assignMutation.mutate(data))} className="space-y-4">
          <div>
            <Label>Chore</Label>
            <Select onValueChange={(value) => setValue('choreId', value)} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a chore template..." />
              </SelectTrigger>
              <SelectContent>
                {choreTemplates?.map(chore => (
                  <SelectItem key={chore.id} value={chore.id}>{chore.title} ({chore.points} pts)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.choreId && <p className="text-red-500 text-sm mt-1">{errors.choreId.message}</p>}
          </div>
          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => setValue('dueDate', date as Date)}
                  disabled={{ before: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign Chore'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};