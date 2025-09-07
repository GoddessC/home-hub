import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SkinTone = {
  name: string;
  color: string;
  headUrl: string;
  bodyUrl: string;
};

interface SkinTonePickerProps {
  onSelect: (tone: SkinTone) => void;
  selectedHeadUrl?: string | null;
  className?: string;
}

// Base URL for Supabase Storage 'avatars' bucket
const BASE_URL = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars';

const skinTones: SkinTone[] = [
  { name: 'light',  color: '#F6D1BE', headUrl: `${BASE_URL}/light_head.png`,  bodyUrl: `${BASE_URL}/light_body.png` },
  { name: 'medium', color: '#D8A083', headUrl: `${BASE_URL}/medium_head.png`, bodyUrl: `${BASE_URL}/medium_body.png` },
  { name: 'brown',  color: '#8C5532', headUrl: `${BASE_URL}/brown_head.png`,  bodyUrl: `${BASE_URL}/brown_body.png` },
  { name: 'deep',   color: '#3E2518', headUrl: `${BASE_URL}/deep_head.png`,   bodyUrl: `${BASE_URL}/deep_body.png` },
];

export const SkinTonePicker: React.FC<SkinTonePickerProps> = ({ onSelect, selectedHeadUrl, className }) => {
  const isSelected = (tone: SkinTone) => {
    if (!selectedHeadUrl) return false;
    return selectedHeadUrl === tone.headUrl || selectedHeadUrl.endsWith(`/${tone.name}_head.png`);
  };

  return (
    <Card className={cn('p-4 flex-row', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Skin tone</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {skinTones.map((tone) => {
          const selected = isSelected(tone);
          return (
            <button
              key={tone.name}
              type="button"
              onClick={() => onSelect(tone)}
              className={cn(
                'h-10 w-10 rounded-full border transition-all',
                selected
                  ? 'ring-2 ring-primary border-white shadow-md'
                  : 'border-muted-foreground/20 hover:ring-2 hover:ring-primary/40'
              )}
              style={{ backgroundColor: tone.color }}
              aria-label={`Skin tone: ${tone.name}`}
              title={tone.name.charAt(0).toUpperCase() + tone.name.slice(1)}
            />
          );
        })}
      </div>
    </Card>
  );
};

export default SkinTonePicker;