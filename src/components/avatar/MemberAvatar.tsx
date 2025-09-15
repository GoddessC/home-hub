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
  currentFeeling?: string | null;
}

type AvatarConfig = Record<string, AvatarItemConfig>;

const zIndexMap: Record<string, number> = {
    hair_back: 12,
    base_body: 10,
    shirt: 20,
    tops: 20,
    bottoms: 18,
    shoes: 16,
    base_head: 15,
    face: 25,
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
  width: '100%',
  height: 'auto',
  top: '10%',
  left: 0,
  right: 0,
  margin: '0 auto',
};

const baseHeadStyle: React.CSSProperties = {
  width: '100%',
}

const bottomsStyle: React.CSSProperties = {
  position: 'absolute',
  width: '40%',
  top: '55%',
  left: '28%',
  height: 'auto',
}

const shoesStyle: React.CSSProperties = {
  position: 'absolute',
  width: '40%',
  top: '80%',
  left: '24%',
  height: 'auto',
}

const topsStyle: React.CSSProperties = {
  position: 'absolute',
  top: '28%',
  left: '18%',
  width: '65%',
  height: 'auto',
}

const faceStyle: React.CSSProperties = {
  position: 'absolute',
  width: '55%',
  height: 'auto',
  top: '35%',
  right: '0',
  left: '-5px',
  margin: '0 auto',
}

const hairStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: 'auto',
  top: '10%',
  left: '0',
}

const hairBackStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: 'auto',
  top: '10%',
  left: '0',
}


export const MemberAvatar = ({ memberId, className, viewMode = 'headshot', currentFeeling }: MemberAvatarProps) => {
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

  // Get the feeling-based face if currentFeeling is provided
  const { data: feelingFace } = useQuery({
    queryKey: ['feeling_face', currentFeeling],
    queryFn: async () => {
      if (!currentFeeling) return null;
      const { data, error } = await supabase
        .from('feeling_face_mapping')
        .select(`
          face_item_id,
          avatar_items!inner(id, name, asset_url)
        `)
        .eq('feeling', currentFeeling)
        .single();
      if (error) return null;
      return (data?.avatar_items as any) || null;
    },
    enabled: !!currentFeeling,
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
  const faceItem = savedConfig.face;

  // Determine which face to show: feeling-based face (if currentFeeling provided) or saved face
  const displayFace = currentFeeling ? feelingFace : faceItem;

  return (
    <div className={cn("relative w-24 h-36", className)}>
      {/* Back Hair Layer */}
      {hairItem && (
        <img 
          src={hairItem.asset_url_back || hairItem.asset_url?.replace('_front.png', '_back.png') || hairItem.asset_url} 
          alt="Hair Back" 
          className="object-contain" 
          style={{ ...hairBackStyle, zIndex: zIndexMap['hair_back'] }} 
        />
      )}

      {/* Base Body - ONLY in full view mode */}
      {viewMode === 'full' && bodyItem && (
        <img src={bodyItem.asset_url} alt="Avatar Body" className="object-contain" style={{ ...bodyStyle, zIndex: zIndexMap['base_body'] }} />
      )}

      {/* Base Head */}
      {headItem && (
        <img src={headItem.asset_url} alt="Avatar Head" style={{ ...headStyle, ...baseHeadStyle, zIndex: zIndexMap['base_head'] }} className="object-contain" />
      )}

      {/* Face Expression */}
      {displayFace && (
        <img src={displayFace.asset_url} alt="Face Expression" style={{ ...faceStyle, zIndex: zIndexMap['face'] }} className="object-contain" />
      )}

      {/* Equipped Items */}
      {Object.entries(savedConfig).map(([category, item]) => {
        if (!item || ['hair', 'base_body', 'base_head', 'face'].includes(category)) return null;
        
        const isBodyItem = ['shirt', 'tops', 'bottoms', 'shoes'].includes(category);
        
        // Don't render body items in headshot view
        if (viewMode === 'headshot' && isBodyItem) {
            return null;
        }

        // Apply specific styles based on category
        let itemStyle = headStyle; // default
        if (category === 'tops') {
          itemStyle = topsStyle;
        } else if (category === 'bottoms') {
          itemStyle = bottomsStyle;
        } else if (category === 'shoes') {
          itemStyle = shoesStyle;
        } else if (category === 'face') {
          itemStyle = faceStyle;
        }else if (isBodyItem) {
          itemStyle = bodyStyle;
        }

        return <img key={item.id} src={item.asset_url} alt={category} className="object-contain" style={{ ...itemStyle, zIndex: zIndexMap[category] || 15 }} />
      })}

      {/* Front Hair Layer */}
      {hairItem && (
        <img src={hairItem.asset_url} alt="Hair Front" className="object-contain" style={{ ...hairStyle, zIndex: zIndexMap['hair'] }} />
      )}
    </div>
  );
};