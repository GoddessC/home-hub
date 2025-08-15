import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StoreItemCard } from '@/components/StoreItemCard';
import { showSuccess, showError } from '@/utils/toast';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export const StorePage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { household } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all available items for the store
  const { data: storeItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['store_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('avatar_items').select('*').neq('category', 'base_body');
      if (error) throw error;
      return data;
    },
  });

  // Fetch the inventory for the specific member
  const { data: memberInventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['member_inventory', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase.from('member_avatar_inventory').select('item_id').eq('member_id', memberId);
      if (error) throw error;
      return data.map(item => item.item_id);
    },
    enabled: !!memberId,
  });

  // Calculate member's available points
  const { data: availablePoints, isLoading: isLoadingPoints } = useQuery({
    queryKey: ['member_available_points', memberId],
    queryFn: async () => {
      if (!memberId) return 0;
      const { data: earned, error: earnedError } = await supabase
        .from('chore_log').select('chores(points)').eq('member_id', memberId).not('completed_at', 'is', null);
      if (earnedError) throw earnedError;
      const totalEarned = earned.reduce((acc, item: any) => acc + (Array.isArray(item.chores) ? item.chores[0]?.points : item.chores?.points || 0), 0);

      const { data: spent, error: spentError } = await supabase
        .from('member_avatar_inventory').select('avatar_items(points_cost)').eq('member_id', memberId);
      if (spentError) throw spentError;
      const totalSpent = spent.reduce((acc, item: any) => acc + (Array.isArray(item.avatar_items) ? item.avatar_items[0]?.points_cost : item.avatar_items?.points_cost || 0), 0);
      
      return totalEarned - totalSpent;
    },
    enabled: !!memberId,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!memberId) throw new Error("Member not found");
      const { error } = await supabase.rpc('purchase_avatar_item', { p_member_id: memberId, p_item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Item purchased!");
      queryClient.invalidateQueries({ queryKey: ['member_inventory', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member_available_points', memberId] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const isLoading = isLoadingItems || isLoadingInventory || isLoadingPoints;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Avatar Store</h1>
            <p className="text-muted-foreground">
              Available Points: {isLoading ? <Skeleton className="h-5 w-12 inline-block" /> : availablePoints}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {storeItems?.map(item => (
              <StoreItemCard
                key={item.id}
                item={item}
                isOwned={memberInventory?.includes(item.id) ?? false}
                canAfford={(availablePoints ?? 0) >= item.points_cost}
                onPurchase={purchaseMutation.mutate}
                isPurchasing={purchaseMutation.isPending}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};