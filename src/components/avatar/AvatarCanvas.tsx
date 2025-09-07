import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Cloud } from 'lucide-react';

interface AvatarCanvasProps {
  config: Record<string, { id: string; asset_url: string; asset_url_back?: string } | null>;
  isPoofing: boolean;
}

export const AvatarCanvas = ({ config, isPoofing }: AvatarCanvasProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'avatar-drop-zone',
  });

  const zIndexMap: Record<string, number> = {
    hair_back: 10,
    base_body: 12,
    base_head: 15,
    shirt: 20,
    hair: 30,
    accessory: 25,
  };

  // Extract base layers and equipped items from the config
  const baseBody = config?.base_body;
  const baseHead = config?.base_head;
  const hairItem = config?.hair;
  const equippedItems = Object.fromEntries(
    Object.entries(config).filter(([key]) => key !== 'base_body' && key !== 'base_head' && key !== 'hair')
  );

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "w-full md:w-1/2 lg:w-1/3 aspect-[2/3] relative flex items-center justify-center transition-colors duration-300",
        isOver ? "bg-primary/10" : "bg-background"
      )}
    >
      <div className="absolute inset-0 w-full h-full">
        {/* Back Hair Layer */}
        {hairItem?.asset_url_back && (
          <img src={hairItem.asset_url_back} alt="Hair Back" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain" style={{ zIndex: zIndexMap['hair_back'] }} />
        )}

        {/* Base Layers */}
        {baseBody && (
          <img src={baseBody.asset_url} alt="Avatar Body" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain top-1/3 right-[5%]" style={{ zIndex: zIndexMap['base_body'] }} />
        )}
        {baseHead && (
          <img src={baseHead.asset_url} alt="Avatar Head" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain" style={{ zIndex: zIndexMap['base_head'] }} />
        )}

        {/* Equipped Items (excluding hair) */}
        {Object.entries(equippedItems).map(([category, item]) => (
          item && <img key={item.id} src={item.asset_url} alt={category} className="absolute inset-0 w-1/2 h-auto object-contain" style={{ zIndex: zIndexMap[category] || 15 }} />
        ))}

        {/* Front Hair Layer */}
        {hairItem && (
          <img src={hairItem.asset_url} alt="Hair Front" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain" style={{ zIndex: zIndexMap['hair'] }} />
        )}

        {/* Poof Animation */}
        {isPoofing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 animate-fade-out" style={{ animationDuration: '300ms' }}>
                <Cloud className="w-32 h-32 text-slate-400 animate-pulse" />
            </div>
        )}
      </div>
    </Card>
  );
};