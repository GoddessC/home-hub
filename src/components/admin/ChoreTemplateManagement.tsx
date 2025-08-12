import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, PlusCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { EditChoreTemplateDialog } from './EditChoreTemplateDialog';

const choreTemplateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  points: z.coerce.number().min(0, 'Points must be a positive number.'),
});
type ChoreTemplateFormValues = z.infer<typeof choreTemplateSchema>;

interface ChoreTemplate {
  id: string;
  title: string;
  points: number;
  household_id: string;
  created_at: string;
}

export const ChoreTemplateManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChore, setSelectedChore] = useState<ChoreTemplate | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChoreTemplateFormValues>({
    resolver: zodResolver(choreTemplateSchema),
  });

  const { data: choreTemplates, isLoading } = useQuery<ChoreTemplate[]>({
    queryKey: ['chore_templates', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('chores').select('*').eq('household_id', household.id).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const addChoreTemplateMutation = useMutation({
    mutationFn: async (values: ChoreTemplateFormValues) => {
      if (!household) throw new Error("Household not found.");
      const { error } = await supabase.from('chores').insert({
        household_id: household.id,
        title: values.title,
        points: values.points,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Chore template created!');
      queryClient.invalidateQueries({ queryKey: ['chore_templates', household?.id] });
      reset();
    },
    onError: (error: Error) => {
      showError(`Failed to create template: ${error.message}`);
    },
  });

  const deleteChoreTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Chore template deleted.');
      queryClient.invalidateQueries({ queryKey: ['chore_templates', household?.id] });
    },
    onError: (error: Error) => {
      showError(`Failed to delete template: ${error.message}`);
    }
  });

  const handleEditClick = (chore: ChoreTemplate) => {
    setSelectedChore(chore);
    setEditDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Chore Templates</CardTitle>
          <CardDescription>Create and manage the master list of chores for your household.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => addChoreTemplateMutation.mutate(data))} className="flex items-end gap-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
              <div className="space-y-2">
                <Label htmlFor="title">Chore Title</Label>
                <Input id="title" {...register('title')} placeholder="e.g., Wash Dishes" className={cn(errors.title && "border-destructive")} />
                {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input id="points" type="number" {...register('points')} placeholder="e.g., 10" className={cn(errors.points && "border-destructive")} />
                {errors.points && <p className="text-red-500 text-sm">{errors.points.message}</p>}
              </div>
            </div>
            <Button type="submit" disabled={addChoreTemplateMutation.isPending || isSubmitting}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </form>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Existing Templates</h4>
            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : choreTemplates && choreTemplates.length > 0 ? (
              <ul className="space-y-3">
                {choreTemplates.map(template => (
                  <li key={template.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground">{template.points} points</p>
                    </div>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(template)}>
                          <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteChoreTemplateMutation.mutate(template.id)} disabled={deleteChoreTemplateMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No chore templates created yet. Add one above to get started.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <EditChoreTemplateDialog
        isOpen={isEditDialogOpen}
        setOpen={setEditDialogOpen}
        chore={selectedChore}
      />
    </>
  );
};