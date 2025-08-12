import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const choreTemplateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  points: z.coerce.number().min(0, 'Points must be a positive number.'),
});
type ChoreTemplateFormValues = z.infer<typeof choreTemplateSchema>;

interface ChoreTemplate {
  id: string;
  title: string;
  points: number;
}

interface EditChoreTemplateDialogProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  chore: ChoreTemplate | null;
}

export const EditChoreTemplateDialog = ({ isOpen, setOpen, chore }: EditChoreTemplateDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChoreTemplateFormValues>({
    resolver: zodResolver(choreTemplateSchema),
    values: {
      title: chore?.title ?? '',
      points: chore?.points ?? 0,
    }
  });

  const editMutation = useMutation({
    mutationFn: async (values: ChoreTemplateFormValues) => {
      if (!chore) throw new Error("Chore not found.");
      const { error } = await supabase
        .from('chores')
        .update({ title: values.title, points: values.points })
        .eq('id', chore.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Chore template updated!');
      queryClient.invalidateQueries({ queryKey: ['chore_templates'] });
      setOpen(false);
      reset();
    },
    onError: (error: Error) => showError(error.message),
  });

  if (!chore) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Chore Template</DialogTitle>
          <DialogDescription>Update the details for this chore.</DialogDescription>
        </DialogHeader>
        <form id="edit-chore-form" onSubmit={handleSubmit(data => editMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Chore Title</Label>
            <Input id="title" {...register('title')} className={cn(errors.title && "border-destructive")} />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Points</Label>
            <Input id="points" type="number" {...register('points')} className={cn(errors.points && "border-destructive")} />
            {errors.points && <p className="text-red-500 text-sm">{errors.points.message}</p>}
          </div>
        </form>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="edit-chore-form" disabled={isSubmitting || editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};