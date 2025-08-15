import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const avatarItemSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Name is required.'),
  category: z.string().min(2, 'Category is required.'),
  asset_url: z.string().url('Must be a valid URL.'),
  points_cost: z.coerce.number().min(0, 'Cost must be 0 or more.'),
});

export type AvatarItemFormValues = z.infer<typeof avatarItemSchema>;

interface AvatarItemFormProps {
  onSubmit: (data: AvatarItemFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<AvatarItemFormValues>;
  isSubmitting: boolean;
}

export const AvatarItemForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: AvatarItemFormProps) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm<AvatarItemFormValues>({
    resolver: zodResolver(avatarItemSchema),
    defaultValues: {
      name: '',
      category: 'shirt',
      asset_url: '',
      points_cost: 100,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" {...register('name')} placeholder="e.g., Cool Sunglasses" className={cn(errors.name && "border-destructive")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(value) => control._formValues.category = value} defaultValue={control._formValues.category}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hair">Hair</SelectItem>
              <SelectItem value="shirt">Shirt</SelectItem>
              <SelectItem value="pants">Pants</SelectItem>
              <SelectItem value="accessory">Accessory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="points_cost">Points Cost</Label>
          <Input id="points_cost" type="number" {...register('points_cost')} className={cn(errors.points_cost && "border-destructive")} />
          {errors.points_cost && <p className="text-red-500 text-sm">{errors.points_cost.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset_url">Asset Image URL</Label>
        <Input id="asset_url" {...register('asset_url')} placeholder="https://..." className={cn(errors.asset_url && "border-destructive")} />
        {errors.asset_url && <p className="text-red-500 text-sm">{errors.asset_url.message}</p>}
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