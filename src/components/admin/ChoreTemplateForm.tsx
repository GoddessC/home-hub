import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DayOfWeekPicker } from './DayOfWeekPicker';
import { cn } from '@/lib/utils';

export const choreTemplateSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  points: z.coerce.number().min(0, 'Points must be a positive number.'),
  is_active: z.boolean().default(true),
  recurrence_type: z.string().default('NONE'),
  recurrence_days: z.array(z.number().min(0).max(6)).default([]),
});

export type ChoreTemplateFormValues = z.infer<typeof choreTemplateSchema>;

interface ChoreTemplateFormProps {
  onSubmit: (data: ChoreTemplateFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<ChoreTemplateFormValues>;
  isSubmitting: boolean;
}

export const ChoreTemplateForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: ChoreTemplateFormProps) => {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ChoreTemplateFormValues>({
    resolver: zodResolver(choreTemplateSchema),
    defaultValues: {
      title: '',
      points: 10,
      is_active: true,
      recurrence_type: 'NONE',
      recurrence_days: [],
      ...defaultValues,
    },
  });

  const recurrenceType = watch('recurrence_type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="is_active" className="font-medium">Recurring Chore Active</Label>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Chore Title</Label>
        <Input id="title" {...register('title')} className={cn(errors.title && "border-destructive")} />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="points">Points</Label>
        <Input id="points" type="number" {...register('points')} className={cn(errors.points && "border-destructive")} />
        {errors.points && <p className="text-red-500 text-sm">{errors.points.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="recurrence_type">Repeats</Label>
        <Controller
          name="recurrence_type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Does not repeat</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKDAYS">Weekdays (Mon-Fri)</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      {recurrenceType === 'WEEKLY' && (
        <div className="space-y-2">
          <Label>Repeat on</Label>
          <Controller
            name="recurrence_days"
            control={control}
            render={({ field }) => <DayOfWeekPicker value={field.value} onChange={field.onChange} />}
          />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </form>
  );
};