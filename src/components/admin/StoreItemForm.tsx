import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';

export const storeItemSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  point_cost: z.coerce.number().min(0, 'Point cost must be 0 or more.'),
  item_category: z.enum(['AVATAR', 'IRL']),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type StoreItemFormValues = z.infer<typeof storeItemSchema>;

interface StoreItemFormProps {
  onSubmit: (data: StoreItemFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<StoreItemFormValues>;
  isSubmitting: boolean;
}

export const StoreItemForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: StoreItemFormProps) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<StoreItemFormValues>({
    resolver: zodResolver(storeItemSchema),
    defaultValues: {
      name: '',
      description: '',
      point_cost: 10,
      item_category: 'AVATAR',
      is_active: true,
      ...defaultValues,
    },
  });

  const itemCategory = watch('item_category');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `store-items/${fileName}`;

    setIsUploading(true);
    try {
      const { error } = await supabase.storage.from('avatars').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setValue('image_url', data.publicUrl, { shouldDirty: true });
    } catch (error: any) {
      showError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = (data: StoreItemFormValues) => {
    let finalData = { ...data };
    if (data.item_category === 'IRL') {
      finalData.image_url = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/public-assets/coin_icon.png';
    }
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Item Category</Label>
        <Controller
          name="item_category"
          control={control}
          render={({ field }) => (
            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
              <div className="flex items-center space-x-2 text-gray-400"><RadioGroupItem value="AVATAR" id="avatar" disabled /><Label htmlFor="avatar">Avatar Item</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="IRL" id="irl" /><Label htmlFor="irl">Real-Life Reward</Label></div>
            </RadioGroup>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" {...register('name')} className={cn(errors.name && "border-destructive")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="point_cost">Point Cost</Label>
        <Input id="point_cost" type="number" {...register('point_cost')} className={cn(errors.point_cost && "border-destructive")} />
        {errors.point_cost && <p className="text-red-500 text-sm">{errors.point_cost.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      {itemCategory === 'AVATAR' && (
        <div className="space-y-2">
          <Label htmlFor="image_url">Image</Label>
          <Input id="image_url" type="file" onChange={handleImageUpload} accept="image/png, image/jpeg, image/gif" disabled={isUploading} />
          {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </Button>
      </div>
    </form>
  );
};