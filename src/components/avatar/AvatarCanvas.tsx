import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Cloud } from 'lucide-react';

interface AvatarCanvasProps {
  config: Record<string, { id: string; asset_url: string } | null>;
  isPoofing: boolean;
}

export const AvatarCanvas = ({ config, isPoofing }: AvatarCanvasProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'avatar-drop-zone',
  });

  const zIndexMap: Record<string, number> = {
    base_body: 10,
    base_head: 15,
    shirt: 20,
    hair: 30,
    accessory: 40,
  };

  // Extract base layers and equipped items from the config
  const baseBody = config?.base_body;
  const baseHead = config?.base_head;
  const equippedItems = Object.fromEntries(
    Object.entries(config).filter(([key]) => key !== 'base_body' && key !== 'base_head')
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
        {/* Base Layers */}
        {baseHead && (
          <img src={baseHead.asset_url} alt="Avatar Head" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_head'] }} />
        )}
        {baseBody && (
          <img src={baseBody.asset_url} alt="Avatar Body" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap['base_body'] }} />
        )}

        {/* Equipped Items */}
        {Object.entries(equippedItems).map(([category, item]) => (
          item && <img key={item.id} src={item.asset_url} alt={category} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: zIndexMap[category] || 15 }} />
        ))}

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