import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil, Gem, Gift, ChevronsUpDown } from 'lucide-react';
import { StoreItemForm, StoreItemFormValues } from './StoreItemForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type StoreItem = StoreItemFormValues & { id: string; };

export const StoreManagement = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  const { data: items, isLoading } = useQuery<StoreItem[]>({
    queryKey: ['store_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_items').select('*').order('created_at');
      if (error) throw error;
      return data;
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
      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Rewards Store</CardTitle>
              <CardDescription>Manage items available for members to purchase with points.</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={handleCreate}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Item
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
              ) : items && items.length > 0 ? (
                <ul className="space-y-3">
                  {items.map(item => (
                    <li key={item.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.item_category === 'AVATAR' ? <Gem className="h-5 w-5 text-blue-600" /> : <Gift className="h-5 w-5 text-green-600" />}
                        <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.point_cost} points · {item.item_category}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
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
                <p className="text-sm text-muted-foreground text-center py-4">No store items created yet.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
            <DialogDescription>Set the item details, cost, and category.</DialogDescription>
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