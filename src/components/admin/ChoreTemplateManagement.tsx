import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, PlusCircle, Pencil, Repeat, Repeat1, ChevronsUpDown } from 'lucide-react';
import { ChoreTemplateForm, ChoreTemplateFormValues } from './ChoreTemplateForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ChoreTemplate = ChoreTemplateFormValues & {
  id: string;
  household_id: string;
  created_at: string;
};

const recurrenceText = {
    NONE: 'One-time only',
    DAILY: 'Daily',
    WEEKDAYS: 'Weekdays',
    WEEKLY: 'Weekly'
}

export const ChoreTemplateManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedChore, setSelectedChore] = useState<ChoreTemplate | null>(null);

  const { data: choreTemplates, isLoading } = useQuery<ChoreTemplate[]>({
    queryKey: ['chore_templates', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('household_id', household.id)
        .eq('is_internal', false)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: ChoreTemplateFormValues) => {
      if (!household) throw new Error("Household not found.");
      const { error } = await supabase.from('chores').upsert({ ...values, household_id: household.id });
      if (error) throw error;
    },
    onSuccess: (_, values) => {
      showSuccess(`Chore template "${values.title}" saved!`);
      queryClient.invalidateQueries({ queryKey: ['chore_templates', household?.id] });
      setFormOpen(false);
      setSelectedChore(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Chore template deleted.');
      queryClient.invalidateQueries({ queryKey: ['chore_templates', household?.id] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleEdit = (chore: ChoreTemplate) => {
    setSelectedChore(chore);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedChore(null);
    setFormOpen(true);
  };

  return (
    <>
      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Chore Templates</CardTitle>
              <CardDescription>Create and manage the master list of chores for your household.</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={handleCreate}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : choreTemplates && choreTemplates.length > 0 ? (
                <ul className="space-y-3">
                  {choreTemplates.map(template => (
                    <li key={template.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-3">
                        {template.recurrence_type === 'NONE' ? <Repeat1 className="h-5 w-5 text-muted-foreground" /> : <Repeat className="h-5 w-5 text-blue-600" />}
                        <div>
                            <p className="font-medium">{template.title}</p>
                            <p className="text-xs text-muted-foreground">{template.points} points · {recurrenceText[template.recurrence_type as keyof typeof recurrenceText]}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(template.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No chore templates created yet. Add one to get started.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedChore ? 'Edit Chore Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>Set the chore details and recurrence schedule.</DialogDescription>
          </DialogHeader>
          <ChoreTemplateForm
            onSubmit={(data) => upsertMutation.mutate(data)}
            onCancel={() => setFormOpen(false)}
            defaultValues={selectedChore ?? undefined}
            isSubmitting={upsertMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};