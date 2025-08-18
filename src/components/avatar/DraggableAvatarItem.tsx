import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DraggableAvatarItemProps {
  item: {
    id: string;
    name: string;
    asset_url: string;
    asset_url_back: string;
    category: string;
  };
}

const zIndexMap: Record<string, number> = {
  hair_back: 12,
  base_body: 10,
  shirt: 20,
  base_head: 15,
  hair: 30,
  accessory: 40,
};

const headStyle: React.CSSProperties = {
width: '60%',
height: 'auto',
top: '10%',
left: 0,
right: 0,
margin: '0 auto',
};

export const DraggableAvatarItem = ({ item }: DraggableAvatarItemProps) => {
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
        <img
          src={item.asset_url_back}
          alt="Hair Back"
          className="object-contain absolute inset-0 w-full h-full"
          style={{ zIndex: zIndexMap['hair_back'] }}
        />
        <img
          src="https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/head.png"
          alt="Avatar Head"
          className="object-contain absolute inset-0 w-full h-full"
          style={{ zIndex: zIndexMap['base_head'] }}
        />
        <img
          src={item.asset_url}
          alt="Hair Front"
          className="object-contain absolute inset-0 w-full h-full"
          style={{ zIndex: zIndexMap['hair'] }}
        />
      </div>
    </Card>
  );
};