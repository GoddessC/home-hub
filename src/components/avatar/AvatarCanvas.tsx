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
    shoes: 16,
    bottoms: 18,
    shirt: 20,
    tops: 20,
    base_head: 15,
    face: 25,
    hair: 30,
    accessory: 25,
  };

  // Positioning styles for different item categories
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
        {hairItem && (
          <img 
            src={hairItem.asset_url_back || hairItem.asset_url?.replace('_front.png', '_back.png') || hairItem.asset_url} 
            alt="Hair Back" 
            className="absolute inset-0 w-1/2 mx-auto h-auto object-contain" 
            style={{ zIndex: zIndexMap['hair_back'] }} 
          />
        )}

        {/* Base Layers */}
        {baseBody && (
          <img src={baseBody.asset_url} alt="Avatar Body" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain top-1/3 right-[5%]" style={{ zIndex: zIndexMap['base_body'] }} />
        )}
        {baseHead && (
          <img src={baseHead.asset_url} alt="Avatar Head" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain" style={{ zIndex: zIndexMap['base_head'] }} />
        )}

        {/* Face Expression */}
        {equippedItems.face && (
          <img src={equippedItems.face.asset_url} alt="Face Expression" className="absolute inset-0 w-1/2 mx-auto h-auto object-contain" style={{ zIndex: zIndexMap['face'] }} />
        )}

        {/* Equipped Items (excluding hair and face) */}
        {Object.entries(equippedItems).map(([category, item]) => {
          if (!item || category === 'face') return null;
          
          // Apply specific styles based on category
          let itemStyle: React.CSSProperties = { position: 'absolute', width: '50%', height: 'auto', left: '25%', top: '50%' }; // default
          
          if (category === 'tops') {
            itemStyle = { ...topsStyle, zIndex: zIndexMap[category] || 15 };
          } else if (category === 'bottoms') {
            itemStyle = { ...bottomsStyle, zIndex: zIndexMap[category] || 15 };
          } else if (category === 'shoes') {
            itemStyle = { ...shoesStyle, zIndex: zIndexMap[category] || 15 };
          } else if (category === 'shirt') {
            itemStyle = { ...bodyStyle, zIndex: zIndexMap[category] || 15 };
          } else {
            itemStyle = { ...headStyle, zIndex: zIndexMap[category] || 15 };
          }
          
          return <img key={item.id} src={item.asset_url} alt={category} className="object-contain" style={itemStyle} />
        })}

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