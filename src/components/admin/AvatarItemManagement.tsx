import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { AvatarItemForm, AvatarItemFormValues } from './AvatarItemForm';

type AvatarItem = AvatarItemFormValues & { id: string };

export const AvatarItemManagement = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AvatarItem | null>(null);

  const { data: items, isLoading } = useQuery<AvatarItem[]>({
    queryKey: ['avatar_items_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('avatar_items').select('*').order('category').order('name');
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: AvatarItemFormValues) => {
      const { error } = await supabase.from('avatar_items').upsert(values);
      if (error) throw error;
    },
    onSuccess: (_, values) => {
      showSuccess(`Item "${values.name}" saved!`);
      queryClient.invalidateQueries({ queryKey: ['avatar_items_admin'] });
      setFormOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('avatar_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Item deleted.');
      queryClient.invalidateQueries({ queryKey: ['avatar_items_admin'] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleEdit = (item: AvatarItem) => {
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
            <CardTitle>Avatar Store Management</CardTitle>
            <CardDescription>Add, edit, or remove items available for purchase.</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Item
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
                    <img src={item.asset_url} alt={item.name} className="h-12 w-12 object-contain bg-white rounded-md p-1" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category} · {item.points_cost} points</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
            <p className="text-sm text-muted-foreground text-center py-4">No items in the store yet.</p>
          )}
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
          </DialogHeader>
          <AvatarItemForm
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