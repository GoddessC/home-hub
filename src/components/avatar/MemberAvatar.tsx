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

const bodyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '75%',
  height: 'auto',
  top: '40%',
  left: 0,
  right: 0,
  margin: '0 auto',
};

const headStyle: React.CSSProperties = {
  position: 'absolute',
  width: '90%',
  height: 'auto',
  top: '10%',
  left: 0,
  right: 0,
  margin: '0 auto',
};

const baseHeadStyle: React.CSSProperties = {
  width: '100%',
}

export const MemberAvatar = ({ memberId, className, viewMode = 'headshot' }: MemberAvatarProps) => {
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
        <img src="https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/medium_head.png" alt="Avatar Head" className="object-contain" style={{ ...headStyle, zIndex: zIndexMap['base_head'] }} />
        {viewMode === 'full' && (
          <img src="https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/medium_body.png" alt="Avatar Body" className="object-contain" style={{ ...bodyStyle, zIndex: zIndexMap['base_body'] }} />
        )}
      </div>
    );
  }

  const hairItem = savedConfig.hair;
  const bodyItem = savedConfig.base_body;
  const headItem = savedConfig.base_head;

  return (
    <div className={cn("relative w-24 h-36", className)}>
      {/* Back Hair Layer */}
      {hairItem?.asset_url_back && (
        <img src={hairItem.asset_url_back} alt="Hair Back" className="object-contain" style={{ ...headStyle, zIndex: zIndexMap['hair_back'] }} />
      )}

      {/* Base Body - ONLY in full view mode */}
      {viewMode === 'full' && bodyItem && (
        <img src={bodyItem.asset_url} alt="Avatar Body" className="object-contain" style={{ ...bodyStyle, zIndex: zIndexMap['base_body'] }} />
      )}

      {/* Base Head */}
      {headItem && (
        <img src={headItem.asset_url} alt="Avatar Head" style={{ ...headStyle, ...baseHeadStyle, zIndex: zIndexMap['base_head'] }} className="object-contain" />
      )}

      {/* Equipped Items */}
      {Object.entries(savedConfig).map(([category, item]) => {
        if (!item || ['hair', 'base_body', 'base_head'].includes(category)) return null;
        
        const isBodyItem = category === 'shirt';
        
        // Don't render body items in headshot view
        if (viewMode === 'headshot' && isBodyItem) {
            return null;
        }

        const itemStyle = isBodyItem ? bodyStyle : headStyle;
        return <img key={item.id} src={item.asset_url} alt={category} className="object-contain" style={{ ...itemStyle, zIndex: zIndexMap[category] || 15 }} />
      })}

      {/* Front Hair Layer */}
      {hairItem && (
        <img src={hairItem.asset_url} alt="Hair Front" className="object-contain" style={{ ...headStyle, zIndex: zIndexMap['hair'] }} />
      )}
    </div>
  );
};