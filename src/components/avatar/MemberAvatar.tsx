import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type AvatarItemConfig = { 
  id: string; 
  asset_url: string;
  asset_url_back?: string | null;
} | null;

interface MemberAvatarProps {
  memberId: string;
  className?: string;
  viewMode?: 'full' | 'headshot';
}

type AvatarConfig = Record<string, AvatarItemConfig>;

const zIndexMap: Record<string, number> = {
    hair_back: 12,
    base_body: 10,
    shirt: 20,
    base_head: 15,
    hair: 30,
    accessory: 40,
};

export const MemberAvatar = ({ memberId, className, viewMode = 'full' }: MemberAvatarProps) => {
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['avatar_config', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase.from('member_avatar_config').select('config').eq('member_id', memberId).single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data?.config as AvatarConfig) || null;
    },
    enabled: !!memberId,
  });

  if (isLoading) {
    return <Skeleton className={cn("w-24 h-36 rounded-md", className)} />;
  }

  if (!savedConfig) {
    // Fallback for members with no saved config
    return (
      <div className={cn("relative w-24 h-36", className)}>
        <img src="https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatar-assets/head.png" alt="Avatar Head" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_head'] }} />
        {viewMode === 'full' && (
          <img src="https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatar-assets/body.png" alt="Avatar Body" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_body'] }} />
        )}
      </div>
    );
  }

  const renderableItems = Object.entries(savedConfig).filter(([category]) => {
    if (viewMode === 'headshot') {
      return category === 'base_head' || category === 'hair';
    }
    return true; // Full view
  });

  const hairItem = savedConfig.hair;

  return (
    <div className={cn("relative w-24 h-36", className)}>
      {/* Back Hair Layer */}
      {viewMode === 'full' && hairItem?.asset_url_back && (
        <img src={hairItem.asset_url_back} alt="Hair Back" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['hair_back'] }} />
      )}

      {/* Render other items based on viewMode */}
      {renderableItems.map(([category, item]) => {
        if (!item || category === 'hair') return null;
        return <img key={item.id} src={item.asset_url} alt={category} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap[category] || 15 }} />
      })}

      {/* Front Hair Layer */}
      {hairItem && (
        <img src={hairItem.asset_url} alt="Hair Front" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['hair'] }} />
      )}
    </div>
  );
};