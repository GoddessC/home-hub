import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DraggableAvatarItemProps {
  item: {
    id: string;
    name: string;
    asset_url: string;
    asset_url_back?: string | null;
    category: string;
  };
  currentHeadUrl?: string | null;
}

const zIndexMap: Record<string, number> = {
  hair_back: 12,
  base_body: 10,
  shoes: 16,
  bottoms: 18,
  shirt: 20,
  tops: 20,
  base_head: 15,
  face: 25,
  hair: 30,
  accessory: 40,
};

// Positioning styles for different item categories
const headStyle: React.CSSProperties = {
  position: 'absolute',
  width: '90%',
  height: 'auto',
  top: '10%',
  left: '5%',
};

const bodyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '75%',
  height: 'auto',
  top: '40%',
  left: '12.5%',
};

const bottomsStyle: React.CSSProperties = {
  position: 'absolute',
  width: '40%',
  top: '55%',
  left: '28%',
  height: 'auto',
};

const shoesStyle: React.CSSProperties = {
  position: 'absolute',
  width: '40%',
  top: '80%',
  left: '24%',
  height: 'auto',
};

const topsStyle: React.CSSProperties = {
  position: 'absolute',
  top: '28%',
  left: '18%',
  width: '65%',
  height: 'auto',
};

export const DraggableAvatarItem = ({ item, currentHeadUrl }: DraggableAvatarItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      category: item.category,
      asset_url: item.asset_url,
      asset_url_back: item.asset_url_back,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 aspect-square relative flex cursor-grab touch-none",
        isDragging && "opacity-50 z-50 shadow-lg"
      )}
    >
      <div className="absolute inset-0 w-full h-full">
        {item.category === 'hair' && (
          <img
            src={item.asset_url_back || item.asset_url?.replace('_front.png', '_back.png') || item.asset_url}
            alt="Hair Back"
            className="object-contain"
            style={{ ...headStyle, zIndex: zIndexMap['hair_back'] }}
          />
        )}
        {item.category === 'hair' && currentHeadUrl && (
          <img
            src={currentHeadUrl}
            alt="Avatar Head"
            className="object-contain"
            style={{ ...headStyle, zIndex: zIndexMap['base_head'] }}
          />
        )}
        {item.category === 'face' && currentHeadUrl && (
          <img
            src={currentHeadUrl}
            alt="Avatar Head"
            className="object-contain"
            style={{ ...headStyle, zIndex: zIndexMap['base_head'] }}
          />
        )}
        <img
          src={item.asset_url}
          alt={item.category}
          className="object-contain"
          style={{ 
            ...(item.category === 'tops' ? topsStyle : 
                item.category === 'bottoms' ? bottomsStyle :
                item.category === 'shoes' ? shoesStyle :
                item.category === 'shirt' ? bodyStyle :
                headStyle),
            zIndex: zIndexMap[item.category] || 15
          }}
        />
      </div>
    </Card>
  );
};