import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DraggableAvatarItem } from './DraggableAvatarItem';

// Mock inventory for now. In the future, this would come from the `member_avatar_inventory` table.
const useMemberInventory = (memberId?: string) => {
  return useQuery({
    queryKey: ['avatar_items', memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from('avatar_items').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });
};

export const InventoryPanel = () => {
  const { member } = useAuth();
  const { data: items, isLoading } = useMemberInventory(member?.id);

  const categories = Array.from(new Set(items?.map(item => item.category).filter(cat => cat !== 'base_body')));

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 p-4 bg-secondary rounded-lg shadow-inner">
      <h2 className="text-xl font-bold mb-4">Your Items</h2>
      {isLoading ? (
        <Skeleton className="w-full h-64" />
      ) : (
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
      )}
    </div>
  );
};