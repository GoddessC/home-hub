import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DraggableAvatarItem } from './DraggableAvatarItem';

interface InventoryPanelProps {
  memberId: string | undefined;
}

const useMemberInventory = (memberId?: string) => {
  return useQuery({
    queryKey: ['member_inventory_items', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      // Fetch the items from the inventory and join with the item details.
      const { data, error } = await supabase
        .from('member_avatar_inventory')
        .select('avatar_items(*)')
        .eq('member_id', memberId);
        
      if (error) throw error;
      
      // The result is an array like [{ avatar_items: {...} }]. We need to extract the item details.
      return data.map(inventoryEntry => inventoryEntry.avatar_items).filter(Boolean);
    },
    enabled: !!memberId,
  });
};

export const InventoryPanel = ({ memberId }: InventoryPanelProps) => {
  const { data: items, isLoading } = useMemberInventory(memberId);

  const categories = Array.from(new Set(items?.map(item => item.category).filter(cat => cat !== 'base_body')));

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 p-4 bg-secondary rounded-lg shadow-inner">
      <h2 className="text-xl font-bold mb-4">Your Items</h2>
      {isLoading ? (
        <Skeleton className="w-full h-64" />
      ) : items && items.length > 0 ? (
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="capitalize">{category}</TabsTrigger>
            ))}
          </TabsList>
          {categories.map(category => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {items?.filter(item => item.category === category).map(item => (
                  <DraggableAvatarItem key={item.id} item={item} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="text-center text-muted-foreground py-8">
            <p>You don't own any items yet.</p>
            <p className="text-sm">Visit the store to buy some!</p>
        </div>
      )}
    </div>
  );
};