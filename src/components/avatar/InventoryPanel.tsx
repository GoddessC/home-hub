import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DraggableAvatarItem } from './DraggableAvatarItem';

interface InventoryPanelProps {
  memberId: string | undefined;
  currentHeadUrl?: string | null;
}

type AvatarItem = {
  id: string;
  name: string;
  category: string;
  asset_url: string;
  asset_url_back: string | null;
  created_at: string;
}

const useMemberInventory = (memberId?: string) => {
  return useQuery({
    queryKey: ['member_inventory_items', memberId],
    queryFn: async () => {
      if (!memberId) return [];

      // 1) Fetch owned item ids
      const { data: owned, error: ownedErr } = await supabase
        .from('member_avatar_inventory')
        .select('item_id')
        .eq('member_id', memberId);
      if (ownedErr) throw ownedErr;
      const ids: string[] = (owned || []).map((r: any) => r.item_id).filter(Boolean);
      if (ids.length === 0) return [];

      // 2) Fetch item details from avatar_items
      const { data: items, error: itemsErr } = await supabase
        .from('avatar_items')
        .select('*')
        .in('id', ids);
      if (itemsErr) throw itemsErr;

      // 3) Normalize and ensure category and asset urls are present
      const normalized: AvatarItem[] = (items || []).map((row: any) => {
        let assetUrl: string = row.asset_url || row.image_url || '';
        if (assetUrl && !/^https?:\/\//i.test(assetUrl)) {
          let relative = String(assetUrl).replace(/^store-assets\//, '');

          // Hair normalization: ensure path is hair/{variant}/{variant}_front.png
          const isHair = (row.category === 'hair' || row.avatar_category === 'hair');
          if (isHair && !relative.startsWith('hair/')) {
            const segments = relative.split('/');
            const variant = segments[0];
            const filename = segments[1] || `${variant}_front.png`;
            relative = `hair/${variant}/${filename}`;
          }

          const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relative);
          assetUrl = pub.publicUrl;
        }

        // Handle full public URL that may lack hair/ segment
        if (assetUrl && /^https?:\/\//i.test(assetUrl) && assetUrl.includes('/store-assets/')) {
          try {
            const url = new URL(assetUrl);
            const idx = url.pathname.indexOf('/store-assets/');
            if (idx !== -1) {
              let relative = url.pathname.substring(idx + '/store-assets/'.length);
              const isHair = (row.category === 'hair' || row.avatar_category === 'hair');
              if (isHair && !relative.startsWith('hair/')) {
                const segments = relative.split('/');
                const variant = segments[0];
                const filename = segments[1] || `${variant}_front.png`;
                relative = `hair/${variant}/${filename}`;
                const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relative);
                assetUrl = pub.publicUrl;
              }
            }
          } catch { /* ignore */ }
        }

        // Hair assets fallback: store-assets/hair/{variant}/{variant}_front.png
        if (!assetUrl && (row.category === 'hair' || row.avatar_category === 'hair') && row.name) {
          const variant = String(row.name).toLowerCase().replace(/\s+/g, '_');
          const path = `hair/${variant}/${variant}_front.png`;
          const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(path);
          assetUrl = pub.publicUrl;
        }

        let backUrl: string | null = row.asset_url_back || null;
        if (backUrl && !/^https?:\/\//i.test(backUrl)) {
          let relBack = String(backUrl).replace(/^store-assets\//, '');

          const isHair = (row.category === 'hair' || row.avatar_category === 'hair');
          if (isHair && !relBack.startsWith('hair/')) {
            const segments = relBack.split('/');
            const variant = segments[0];
            const filename = segments[1] || `${variant}_back.png`;
            relBack = `hair/${variant}/${filename}`;
          }

          const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relBack);
          backUrl = pub.publicUrl;
        }

        if (backUrl && /^https?:\/\//i.test(backUrl) && backUrl.includes('/store-assets/')) {
          try {
            const url = new URL(backUrl);
            const idx = url.pathname.indexOf('/store-assets/');
            if (idx !== -1) {
              let relative = url.pathname.substring(idx + '/store-assets/'.length);
              const isHair = (row.category === 'hair' || row.avatar_category === 'hair');
              if (isHair && !relative.startsWith('hair/')) {
                const segments = relative.split('/');
                const variant = segments[0];
                const filename = segments[1] || `${variant}_back.png`;
                relative = `hair/${variant}/${filename}`;
                const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(relative);
                backUrl = pub.publicUrl;
              }
            }
          } catch { /* ignore */ }
        }

        const category: string = row.category || row.avatar_category || 'other';

        return {
          id: row.id,
          name: row.name,
          category,
          asset_url: assetUrl,
          asset_url_back: backUrl,
          created_at: row.created_at,
        } as AvatarItem;
      });

      return normalized;
    },
    enabled: !!memberId,
  });
};

export const InventoryPanel = ({ memberId, currentHeadUrl }: InventoryPanelProps) => {
  const { data: items, isLoading } = useMemberInventory(memberId);

  const categories = Array.from(
    new Set(
      (items || [])
        .map(item => item.category || 'other')
        .filter(cat => cat && cat !== 'base_body')
    )
  );

  return (
    <div className="w-full p-4 bg-secondary rounded-lg shadow-inner">
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
                {items
                  ?.filter(item => (item.category || 'other') === category)
                  .map(item => (
                  <DraggableAvatarItem key={item.id} item={item} currentHeadUrl={currentHeadUrl} />
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