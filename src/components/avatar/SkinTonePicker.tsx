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
  { name: 'light',  color: '#F6D1BE', headUrl: `${BASE_URL}/head_light.png`,  bodyUrl: `${BASE_URL}/body_light.png` },
  { name: 'fair',   color: '#F0C2A8', headUrl: `${BASE_URL}/head_fair.png`,   bodyUrl: `${BASE_URL}/body_fair.png` },
  { name: 'medium', color: '#D8A083', headUrl: `${BASE_URL}/head_medium.png`, bodyUrl: `${BASE_URL}/body_medium.png` },
  { name: 'tan',    color: '#B87957', headUrl: `${BASE_URL}/head_tan.png`,    bodyUrl: `${BASE_URL}/body_tan.png` },
  { name: 'brown',  color: '#8C5532', headUrl: `${BASE_URL}/head_brown.png`,  bodyUrl: `${BASE_URL}/body_brown.png` },
  { name: 'dark',   color: '#5F3B25', headUrl: `${BASE_URL}/head_dark.png`,   bodyUrl: `${BASE_URL}/body_dark.png` },
  { name: 'deep',   color: '#3E2518', headUrl: `${BASE_URL}/head_deep.png`,   bodyUrl: `${BASE_URL}/body_deep.png` },
];

export const SkinTonePicker: React.FC<SkinTonePickerProps> = ({ onSelect, selectedHeadUrl, className }) => {
  const isSelected = (tone: SkinTone) => {
    if (!selectedHeadUrl) return false;
    return selectedHeadUrl === tone.headUrl || selectedHeadUrl.endsWith(`/head_${tone.name}.png`);
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Skin tone</h3>
      </div>
      <div className="grid grid-cols-7 gap-3">
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