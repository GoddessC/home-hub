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
}

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
        "p-2 aspect-square flex items-center justify-center cursor-grab touch-none relative",
        isDragging && "opacity-50 z-50 shadow-lg"
      )}
    >
      {item.category === 'hair' && item.asset_url_back && (
        <img 
          src={item.asset_url_back} 
          alt="" 
          className="absolute inset-0 w-full h-full object-contain"
          style={{ zIndex: 1 }}
        />
      )}
      <img 
        src={item.asset_url} 
        alt={item.name} 
        className="w-full h-full object-contain relative"
        style={{ zIndex: 2 }}
      />
    </Card>
  );
};