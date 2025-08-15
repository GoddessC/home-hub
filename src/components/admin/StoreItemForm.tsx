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
import { StoreItem } from './StoreManagement';

export const storeItemSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  point_cost: z.coerce.number().min(0, 'Point cost must be 0 or more.'),
  item_type: z.enum(['HAT', 'SHIRT', 'ACCESSORY']),
  is_active: z.boolean().default(true),
  image: z.union([z.string(), z.instanceof(FileList)])
    .refine(val => (typeof val === 'string' && val.length > 0) || (val instanceof FileList && val.length > 0), {
      message: 'Image is required.'
    }),
});

export type StoreItemFormValues = z.infer<typeof storeItemSchema>;

interface StoreItemFormProps {
  onSubmit: (data: StoreItemFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<StoreItem>;
  isSubmitting: boolean;
}

export const StoreItemForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: StoreItemFormProps) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm<StoreItemFormValues>({
    resolver: zodResolver(storeItemSchema),
    defaultValues: {
      name: '',
      description: '',
      point_cost: 10,
      item_type: 'ACCESSORY',
      is_active: true,
      ...defaultValues,
      image: defaultValues?.image_url,
    },
  });

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
        <Label htmlFor="image">Item Image</Label>
        <Input id="image" type="file" accept="image/png, image/jpeg, image/webp" {...register('image')} className={cn(errors.image && "border-destructive")} />
        {errors.image && <p className="text-red-500 text-sm">{errors.image.message}</p>}
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="is_active" className="font-medium">Is Active in Store?</Label>
        <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
                <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
            )}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </Button>
      </div>
    </form>
  );
};