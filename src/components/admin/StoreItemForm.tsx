import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { showLoading, dismissToast, showError } from '@/utils/toast';
import { UploadCloud } from 'lucide-react';

export const storeItemSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  point_cost: z.coerce.number().min(0, 'Point cost must be 0 or more.'),
  item_type: z.enum(['HAT', 'SHIRT', 'ACCESSORY']),
  image_url: z.string().url('A valid image URL is required.'),
  is_active: z.boolean(),
});

export type StoreItemFormValues = z.infer<typeof storeItemSchema>;

interface StoreItemFormProps {
  onSubmit: (data: StoreItemFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<StoreItemFormValues>;
  isSubmitting: boolean;
}

export const StoreItemForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: StoreItemFormProps) => {
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<StoreItemFormValues>({
    resolver: zodResolver(storeItemSchema),
    defaultValues: {
      name: '',
      description: '',
      point_cost: 100,
      item_type: 'ACCESSORY',
      image_url: '',
      is_active: true,
      ...defaultValues,
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const imageUrl = watch('image_url');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = showLoading('Uploading image...');
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('store-assets').getPublicUrl(filePath);
      setValue('image_url', data.publicUrl, { shouldValidate: true, shouldDirty: true });
    } catch (error: any) {
      showError(`Upload failed: ${error.message}`);
    } finally {
      // FIX: Ensure the toastId is treated as a string.
      dismissToast(String(toastId));
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" {...register('name')} className={cn(errors.name && "border-destructive")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="point_cost">Point Cost</Label>
          <Input id="point_cost" type="number" {...register('point_cost')} className={cn(errors.point_cost && "border-destructive")} />
          {errors.point_cost && <p className="text-red-500 text-sm">{errors.point_cost.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="item_type">Item Type</Label>
          <Controller
            name="item_type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HAT">Hat</SelectItem>
                  <SelectItem value="SHIRT">Shirt</SelectItem>
                  <SelectItem value="ACCESSORY">Accessory</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Item Image</Label>
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <img src={imageUrl} alt="Preview" className="w-20 h-20 rounded-md object-cover border" />
          ) : (
            <div className="w-20 h-20 rounded-md bg-secondary flex items-center justify-center">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <Button type="button" asChild variant="outline">
            <label htmlFor="image-upload">
              {isUploading ? 'Uploading...' : 'Upload Image'}
              <input id="image-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/png, image/jpeg, image/gif" disabled={isUploading} />
            </label>
          </Button>
        </div>
        {errors.image_url && <p className="text-red-500 text-sm">{errors.image_url.message}</p>}
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="is_active">Is Active in Store?</Label>
          <p className="text-[0.8rem] text-muted-foreground">If disabled, this item will not be visible to users in the store.</p>
        </div>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </Button>
      </div>
    </form>
  );
};