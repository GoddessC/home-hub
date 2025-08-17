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
  const { memberId } = useParams<{ memberId: string }>();
  const { member: currentUserMember } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Security check: Ensure the logged-in user is an admin in the same household as the member.
  const { data: member, isLoading: isLoadingMember } = useQuery({
      queryKey: ['member_for_store', memberId],
      queryFn: async () => {
          if (!memberId) return null;
          const { data, error } = await supabase.from('members').select('id, full_name, household_id').eq('id', memberId).single();
          if (error) throw error;
          return data;
      },
      enabled: !!memberId,
  });

  if (!isLoadingMember && member && currentUserMember) {
      const isAdminInHousehold = (currentUserMember.role === 'OWNER' || currentUserMember.role === 'ADULT') && currentUserMember.household_id === member.household_id;
      if (!isAdminInHousehold) {
          showError("You don't have permission to access this store.");
          navigate('/');
      }
  }

  // Fetch the member's available points using the new RPC function
  const { data: memberPoints, isLoading: isLoadingPoints } = useQuery({
    queryKey: ['member_points', memberId],
    queryFn: async () => {
        if (!memberId) return 0;
        const { data, error } = await supabase.rpc('get_member_available_points', { p_member_id: memberId });
        if (error) throw error;
        return data;
    },
    enabled: !!memberId,
  });

  // Fetch all active store items from the avatar_items table
  const { data: storeItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['avatar_items_for_store'],
    queryFn: async () => {
      const { data, error } = await supabase.from('avatar_items').select('*').neq('category', 'base_body');
      if (error) throw error;
      return data;
    },
  });

  // Fetch the member's inventory
  const { data: inventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['member_inventory', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase.from('member_avatar_inventory').select('item_id').eq('member_id', memberId);
      if (error) throw error;
      return data.map(item => item.item_id);
    },
    enabled: !!memberId,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!memberId) throw new Error("Member not found");
      const { error } = await supabase.rpc('purchase_avatar_item', { p_member_id: memberId, p_item_id: itemId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Purchase successful!");
      // Refetch data to update points and inventory
      queryClient.invalidateQueries({ queryKey: ['member_points', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member_inventory', memberId] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const isLoading = isLoadingPoints || isLoadingItems || isLoadingInventory || isLoadingMember;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Rewards Store for {member?.full_name}</h1>
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <div className="flex items-center gap-2 text-lg font-bold bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
              <Coins className="h-6 w-6" />
              <span>{memberPoints ?? 0}</span>
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
                u
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