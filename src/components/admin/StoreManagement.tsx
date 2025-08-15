import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { StoreItemForm, StoreItemFormValues } from './StoreItemForm';
import { Switch } from '../ui/switch';

type StoreItem = StoreItemFormValues & { id: string };

export const StoreManagement = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  const { data: items, isLoading } = useQuery<StoreItem[]>({
    queryKey: ['store_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_items').select('*').order('created_at');
      if (error) throw error;
      return data as StoreItem[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: StoreItemFormValues) => {
      const { error } = await supabase.from('store_items').upsert(values);
      if (error) throw error;
    },
    onSuccess: (_, values) => {
      showSuccess(`Item "${values.name}" saved!`);
      queryClient.invalidateQueries({ queryKey: ['store_items'] });
      setFormOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('store_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Item deleted.');
      queryClient.invalidateQueries({ queryKey: ['store_items'] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
        const { error } = await supabase.from('store_items').update({ is_active }).eq('id', id);
        if (error) throw error;
    },
    onSuccess: () => {
        showSuccess('Item status updated.');
        queryClient.invalidateQueries({ queryKey: ['store_items'] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleEdit = (item: StoreItem) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Store Management</CardTitle>
            <CardDescription>Add, edit, and manage items in the rewards store.</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Item
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : items && items.length > 0 ? (
            <ul className="space-y-3">
              {items.map(item => (
                <li key={item.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-4">
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-md object-cover bg-background" />
                    <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.point_cost} points · <span className="capitalize">{item.item_type.toLowerCase()}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.is_active} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No store items created yet. Add one to get started.</p>
          )}
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
          </DialogHeader>
          <StoreItemForm
            onSubmit={(data) => upsertMutation.mutate(data)}
            onCancel={() => setFormOpen(false)}
            defaultValues={selectedItem ?? undefined}
            isSubmitting={upsertMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};