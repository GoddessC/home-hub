import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StoreItemCard } from '@/components/store/StoreItemCard';
import { showSuccess, showError } from '@/utils/toast';
import { ArrowLeft, Coins } from 'lucide-react';

export const StorePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Security check: Ensure the logged-in user is the one trying to shop, or is an admin in the same household.
  // This is a client-side check; RLS provides the server-side security.
  const { data: member, isLoading: isLoadingMember } = useQuery({
      queryKey: ['member_for_store', userId],
      queryFn: async () => {
          if (!userId) return null;
          const { data, error } = await supabase.from('members').select('id, household_id').eq('user_id', userId).single();
          if (error) throw error;
          return data;
      },
      enabled: !!userId,
  });

  const { data: currentUserMember, isLoading: isLoadingCurrentUser } = useQuery({
      queryKey: ['current_user_member', user?.id],
      queryFn: async () => {
          if (!user?.id) return null;
          const { data, error } = await supabase.from('members').select('user_id, household_id, role').eq('user_id', user.id).single();
          if (error) throw error;
          return data;
      },
      enabled: !!user?.id,
  });

  if (!isLoadingMember && !isLoadingCurrentUser && member && currentUserMember) {
      const isOwner = currentUserMember.user_id === userId;
      const isAdminInHousehold = currentUserMember.role === 'OWNER' && currentUserMember.household_id === member.household_id;
      if (!isOwner && !isAdminInHousehold) {
          showError("You don't have permission to access this store.");
          navigate('/');
      }
  }

  // Fetch the user's profile to get their points
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('id, full_name, points').eq('id', userId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch all active store items
  const { data: storeItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['store_items_active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_items').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch the user's inventory
  const { data: inventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['user_inventory', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from('user_inventory').select('item_id').eq('user_id', userId);
      if (error) throw error;
      return data.map(item => item.item_id);
    },
    enabled: !!userId,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.rpc('purchase_store_item', { p_item_id: itemId });
      if (error) throw new Error(error.message);
      if (data !== 'SUCCESS') throw new Error(`Purchase failed: ${data}`);
      return data;
    },
    onSuccess: () => {
      showSuccess("Purchase successful!");
      // Refetch data to update points and inventory
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['user_inventory', userId] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const isLoading = isLoadingProfile || isLoadingItems || isLoadingInventory || isLoadingMember || isLoadingCurrentUser;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Rewards Store</h1>
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-center gap-2 text-lg font-bold bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
              <Coins className="h-6 w-6" />
              <span>{userProfile?.points ?? 0}</span>
            </div>
          )}
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
                userPoints={userProfile?.points ?? 0}
                isOwned={inventory?.includes(item.id) ?? false}
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