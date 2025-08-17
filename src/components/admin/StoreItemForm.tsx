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
  item_type: z.enum(['HAT', 'SHIRT', 'ACCESSORY', 'HAIR']),
  asset_url: z.string().url('A valid image URL is required.'),
  asset_url_back: z.string().url().optional().nullable(),
  is_active: z.boolean(),
});

export type StoreItemFormValues = z.infer<typeof storeItemSchema>;

interface StoreItemFormProps {
  onSubmit: (data: StoreItemFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<StoreItemFormValues>;
  isSubmitting: boolean;
}

const ImageUploader = ({ label, value, onUpload, isUploading }: { label: string, value?: string | null, onUpload: (url: string) => void, isUploading: boolean }) => {
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = showLoading(`Uploading ${label.toLowerCase()}...`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${label.replace(' ', '_').toLowerCase()}_${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('store-assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('store-assets').getPublicUrl(filePath);
      onUpload(data.publicUrl);
    } catch (error: any) {
      showError(`Upload failed: ${error.message}`);
    } finally {
      dismissToast(String(toastId));
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {value ? (
          <img src={value} alt="Preview" className="w-20 h-20 rounded-md object-cover border" />
        ) : (
          <div className="w-20 h-20 rounded-md bg-secondary flex items-center justify-center">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <Button type="button" asChild variant="outline">
          <label>
            {isUploading ? 'Uploading...' : 'Upload Image'}
            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/png, image/jpeg, image/gif" disabled={isUploading} />
          </label>
        </Button>
      </div>
    </div>
  );
};

export const StoreItemForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: StoreItemFormProps) => {
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<StoreItemFormValues>({
    resolver: zodResolver(storeItemSchema),
    defaultValues: {
      name: '',
      description: '',
      point_cost: 100,
      item_type: 'ACCESSORY',
      asset_url: '',
      asset_url_back: null,
      is_active: true,
      ...defaultValues,
    },
  });

  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const itemType = watch('item_type');
  const imageUrl = watch('asset_url');
  const imageUrlBack = watch('asset_url_back');

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
                  <SelectItem value="HAIR">Hair</SelectItem>
                  <SelectItem value="HAT">Hat</SelectItem>
                  <SelectItem value="SHIRT">Shirt</SelectItem>
                  <SelectItem value="ACCESSORY">Accessory</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      
      <ImageUploader 
        label={itemType === 'HAIR' ? 'Hair (Front)' : 'Item Image'}
        value={imageUrl}
        onUpload={(url) => setValue('asset_url', url, { shouldValidate: true, shouldDirty: true })}
        isUploading={isUploadingFront}
      />
      {errors.asset_url && <p className="text-red-500 text-sm">{errors.asset_url.message}</p>}

      {itemType === 'HAIR' && (
        <>
          <ImageUploader 
            label="Hair (Back)"
            value={imageUrlBack}
            onUpload={(url) => setValue('asset_url_back', url, { shouldValidate: true, shouldDirty: true })}
            isUploading={isUploadingBack}
          />
          {errors.asset_url_back && <p className="text-red-500 text-sm">{errors.asset_url_back.message}</p>}
        </>
      )}

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
        <Button type="submit" disabled={isSubmitting || isUploadingFront || isUploadingBack}>
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </Button>
      </div>
    </form>
  );
};