import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StoreItemCard } from '@/components/store/StoreItemCard';
import { showSuccess, showError } from '@/utils/toast';
import { ArrowLeft, Coins } from 'lucide-react';
import { getMemberAvailablePoints } from '@/utils/pointsUtils';

export const StorePage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { user } = useAuth();
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

  const { data: currentUserMember, isLoading: isLoadingCurrentUser } = useQuery({
      queryKey: ['current_user_member', user?.id],
      queryFn: async () => {
          if (!user?.id) return null;
          const { data, error } = await supabase.from('members').select('household_id, role').eq('user_id', user.id).single();
          if (error) throw error;
          return data;
      },
      enabled: !!user?.id,
  });

  if (!isLoadingMember && !isLoadingCurrentUser && member && currentUserMember) {
      const isAdminInHousehold = currentUserMember.role === 'OWNER' && currentUserMember.household_id === member.household_id;
      if (!isAdminInHousehold) {
          showError("You don't have permission to access this store.");
          navigate('/');
      }
  }

  // Fetch the member's available points
  const { data: memberPoints, isLoading: isLoadingPoints } = useQuery({
    queryKey: ['member_available_points', memberId],
    queryFn: async () => {
        if (!memberId) return 0;
        return await getMemberAvailablePoints(memberId);
    },
    enabled: !!memberId,
  });

  // Fetch the member's avatar configuration to get their head URL
  const { data: memberAvatarConfig, isLoading: isLoadingAvatarConfig } = useQuery({
    queryKey: ['member_avatar_config', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from('member_avatar_config')
        .select('config')
        .eq('member_id', memberId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data?.config as any) || null;
    },
    enabled: !!memberId,
  });

  // Fetch all active store items (avatar items)
  const { data: storeItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['store_items_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avatar_items')
        .select('*');
      if (error) throw error;

      // Normalize to the shape StoreItemCard expects and ensure image_url is populated
      const normalized = (data || []).map((row: any) => {
        let imageUrl: string | undefined = row.image_url || row.asset_url;
        const isHair = (row.category === 'hair' || row.avatar_category === 'hair');

        // Case A: provided value is a storage-relative path
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
          let relativePath = imageUrl.replace(/^store-assets\//, '');

          // Normalize hair path to hair/{variant}/{variant}_front.png
          if (isHair && !relativePath.startsWith('hair/')) {
            const segments = relativePath.split('/');
            const variant = segments[0];
            const filename = segments[1] || `${variant}_front.png`;
            relativePath = `hair/${variant}/${filename}`;
          }

          const { data: pub } = supabase.storage
            .from('store-assets')
            .getPublicUrl(relativePath);
          imageUrl = pub.publicUrl;
        }

        // Case B: provided value is a full public URL but missing the hair/ segment
        if (imageUrl && /^https?:\/\//i.test(imageUrl) && imageUrl.includes('/store-assets/')) {
          try {
            const url = new URL(imageUrl);
            const idx = url.pathname.indexOf('/store-assets/');
            if (idx !== -1) {
              let relativePath = url.pathname.substring(idx + '/store-assets/'.length);
              if (isHair && !relativePath.startsWith('hair/')) {
                // e.g., hair_one/hair_one_front.png -> hair/hair_one/hair_one_front.png
                const segments = relativePath.split('/');
                const variant = segments[0];
                const filename = segments[1] || `${variant}_front.png`;
                relativePath = `hair/${variant}/${filename}`;
                const { data: pub } = supabase.storage
                  .from('store-assets')
                  .getPublicUrl(relativePath);
                imageUrl = pub.publicUrl;
              }
            }
          } catch { /* ignore URL parse errors */ }
        }

        // Fallback for hair when nothing provided
        if ((!imageUrl || imageUrl === '') && isHair && row.name) {
          const variant = String(row.name).toLowerCase().replace(/\s+/g, '_');
          const path = `hair/${variant}/${variant}_front.png`;
          const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(path);
          imageUrl = pub.publicUrl;
        }

        // Handle back hair URL for hair items
        let backImageUrl: string | null = null;
        if (isHair) {
          // Try to use existing asset_url_back
          if (row.asset_url_back) {
            let backUrl = row.asset_url_back;
            if (!/^https?:\/\//i.test(backUrl)) {
              let relBack = String(backUrl).replace(/^store-assets\//, '');
              if (!relBack.startsWith('hair/')) {
                const segments = relBack.split('/');
                const variant = segments[0];
                const filename = segments[1] || `${variant}_back.png`;
                relBack = `hair/${variant}/${filename}`;
              }
              const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relBack);
              backImageUrl = pub.publicUrl;
            } else {
              // Handle full URL that might be missing the hair/ segment
              if (backUrl.includes('/store-assets/')) {
                try {
                  const url = new URL(backUrl);
                  const idx = url.pathname.indexOf('/store-assets/');
                  if (idx !== -1) {
                    let relative = url.pathname.substring(idx + '/store-assets/'.length);
                    if (!relative.startsWith('hair/')) {
                      const segments = relative.split('/');
                      const variant = segments[0];
                      const filename = segments[1] || `${variant}_back.png`;
                      relative = `hair/${variant}/${filename}`;
                      const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relative);
                      backImageUrl = pub.publicUrl;
                    } else {
                      backImageUrl = backUrl;
                    }
                  } else {
                    backImageUrl = backUrl;
                  }
                } catch {
                  backImageUrl = backUrl;
                }
              } else {
                backImageUrl = backUrl;
              }
            }
          } else {
            // Generate back hair URL from front hair URL
            const generatedBackUrl = imageUrl?.replace('_front.png', '_back.png');
            if (generatedBackUrl && generatedBackUrl.includes('/store-assets/')) {
              try {
                const url = new URL(generatedBackUrl);
                const idx = url.pathname.indexOf('/store-assets/');
                if (idx !== -1) {
                  let relative = url.pathname.substring(idx + '/store-assets/'.length);
                  if (!relative.startsWith('hair/')) {
                    const segments = relative.split('/');
                    const variant = segments[0];
                    const filename = segments[1] || `${variant}_back.png`;
                    relative = `hair/${variant}/${filename}`;
                    const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relative);
                    backImageUrl = pub.publicUrl;
                  } else {
                    backImageUrl = generatedBackUrl;
                  }
                } else {
                  backImageUrl = generatedBackUrl;
                }
              } catch {
                backImageUrl = generatedBackUrl;
              }
            } else {
              backImageUrl = generatedBackUrl || null;
            }
          }
        }

        const pointCost =
          row.point_cost ??
          row.points_cost ??
          row.points ??
          row.cost ??
          0;

        return {
          id: row.id,
          name: row.name,
          image_url: imageUrl || '',
          back_image_url: backImageUrl,
          category: row.category || row.avatar_category || 'other',
          point_cost: pointCost,
        };
      });

      return normalized;
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
      queryClient.invalidateQueries({ queryKey: ['member_available_points', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member_inventory', memberId] });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const isLoading = isLoadingPoints || isLoadingItems || isLoadingInventory || isLoadingMember || isLoadingCurrentUser || isLoadingAvatarConfig;

  // Extract the head URL from the member's avatar config
  const currentHeadUrl = memberAvatarConfig?.base_head?.asset_url || null;

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
                userPoints={memberPoints ?? 0}
                isOwned={inventory?.includes(item.id) ?? false}
                onPurchase={purchaseMutation.mutate}
                isPurchasing={purchaseMutation.isPending}
                currentHeadUrl={currentHeadUrl}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};