import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  memberId: string;
  className?: string;
}

type AvatarConfig = Record<string, { id: string; asset_url: string } | null>;

// Static URLs for the default base avatar parts, used as a fallback.
const BASE_BODY_URL = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatar-assets/body.png';
const BASE_HEAD_URL = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatar-assets/head.png';

const zIndexMap: Record<string, number> = {
    base_body: 10,
    base_head: 15,
    shirt: 20,
    hair: 30,
    accessory: 40,
};

export const MemberAvatar = ({ memberId, className }: MemberAvatarProps) => {
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['avatar_config', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase.from('member_avatar_config').select('config').eq('member_id', memberId).single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data?.config as AvatarConfig) || {};
    },
    enabled: !!memberId,
  });

  if (isLoading) {
    return <Skeleton className={cn("w-24 h-36 rounded-md", className)} />;
  }

  const renderBaseBody = !savedConfig?.base_body;
  const renderBaseHead = !savedConfig?.base_head;

  return (
    <div className={cn("relative w-24 h-36", className)}>
      {/* Fallback Base Layers */}
      {renderBaseBody && (
        <img src={BASE_BODY_URL} alt="Avatar Body" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_body'] }} />
      )}
      {renderBaseHead && (
        <img src={BASE_HEAD_URL} alt="Avatar Head" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_head'] }} />
      )}

      {/* Equipped Items from Config */}
      {savedConfig && Object.entries(savedConfig).map(([category, item]) => (
        item && <img key={item.id} src={item.asset_url} alt={category} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap[category] || 15 }} />
      ))}
    </div>
  );
};