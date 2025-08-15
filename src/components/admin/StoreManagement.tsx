import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { StoreItemForm, StoreItemFormValues } from './StoreItemForm';

export type StoreItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  point_cost: number;
  item_type: 'HAT' | 'SHIRT' | 'ACCESSORY';
  is_active: boolean;
  created_at: string;
};

export const StoreManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  const { data: items, isLoading } = useQuery<StoreItem[]>({
    queryKey: ['store_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: StoreItemFormValues) => {
      if (!user) throw new Error("Not authorized");

      let imageUrl = typeof values.image === 'string' ? values.image : '';
      if (values.image instanceof FileList && values.image.length > 0) {
        const file = values.image[0];
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('store-assets').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { id, image, ...itemData } = values;
      const dataToUpsert = { ...itemData, image_url: imageUrl, id: id || undefined };

      const { error } = await supabase.from('store_items').upsert(dataToUpsert);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Store item saved!');
      queryClient.invalidateQueries({ queryKey: ['store_items'] });
      setFormOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('store_items').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Item status updated.');
      queryClient.invalidateQueries({ queryKey: ['store_items'] });
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
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Store Management</CardTitle>
            <CardDescription>Add, edit, and manage items in the rewards store.</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Item
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium flex items-center gap-3">
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-md object-cover bg-gray-200" />
                      {item.name}
                    </TableCell>
                    <TableCell>{item.item_type}</TableCell>
                    <TableCell>{item.point_cost} pts</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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