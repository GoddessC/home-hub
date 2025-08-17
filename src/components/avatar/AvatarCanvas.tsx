import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Cloud } from 'lucide-react';

type AvatarItemConfig = { 
  id: string; 
  asset_url: string;
  asset_url_back?: string | null;
} | null;

interface AvatarCanvasProps {
  config: Record<string, AvatarItemConfig>;
  isPoofing: boolean;
}

export const AvatarCanvas = ({ config, isPoofing }: AvatarCanvasProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'avatar-drop-zone',
  });

  const zIndexMap: Record<string, number> = {
    hair_back: 12,
    base_body: 10,
    shirt: 20,
    base_head: 15,
    hair: 30,
    accessory: 40,
  };

  const hairItem = config?.hair;

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
          <img src={hairItem.asset_url_back} alt="Hair Back" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['hair_back'] }} />
        )}

        {/* Base Layers */}
        {config.base_body && (
          <img src={config.base_body.asset_url} alt="Avatar Body" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_body'] }} />
        )}
        {config.base_head && (
          <img src={config.base_head.asset_url} alt="Avatar Head" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_head'] }} />
        )}

        {/* Equipped Items (excluding hair, which is handled separately) */}
        {Object.entries(config).map(([category, item]) => {
          if (!item || category === 'hair' || category === 'base_body' || category === 'base_head') return null;
          return <img key={item.id} src={item.asset_url} alt={category} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap[category] || 15 }} />
        })}

        {/* Front Hair Layer */}
        {hairItem && (
          <img src={hairItem.asset_url} alt="Hair Front" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['hair'] }} />
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