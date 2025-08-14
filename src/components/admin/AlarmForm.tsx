import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DayOfWeekPicker } from './DayOfWeekPicker';
import { cn } from '@/lib/utils';

export const alarmSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Name is required.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format.'),
  days_of_week: z.array(z.number().min(0).max(6)).default([]),
  sound: z.string(),
  notes: z.string().optional(),
  snooze_duration_minutes: z.coerce.number(),
  is_active: z.boolean(),
});

export type AlarmFormValues = z.infer<typeof alarmSchema>;

interface AlarmFormProps {
  onSubmit: (data: AlarmFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<AlarmFormValues>;
  isSubmitting: boolean;
}

export const AlarmForm = ({ onSubmit, onCancel, defaultValues, isSubmitting }: AlarmFormProps) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm<AlarmFormValues>({
    resolver: zodResolver(alarmSchema),
    defaultValues: {
      name: '',
      time: '07:00',
      days_of_week: [],
      sound: 'bell',
      notes: '',
      snooze_duration_minutes: 5,
      is_active: true,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="is_active" className="font-medium">Alarm Enabled</Label>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Alarm Name</Label>
        <Input id="name" {...register('name')} placeholder="e.g., Wake-up" className={cn(errors.name && "border-destructive")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <Input id="time" type="time" {...register('time')} className={cn(errors.time && "border-destructive")} />
        {errors.time && <p className="text-red-500 text-sm">{errors.time.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Repeat</Label>
        <Controller
          name="days_of_week"
          control={control}
          render={({ field }) => <DayOfWeekPicker value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sound">Alarm Sound</Label>
          <Controller
            name="sound"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bell">Bell</SelectItem>
                  <SelectItem value="beep">Beep</SelectItem>
                  <SelectItem value="chimes">Chimes</SelectItem>
                  <SelectItem value="silent">Silent</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="snooze_duration_minutes">Snooze (minutes)</Label>
          <Controller
            name="snooze_duration_minutes"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Checklist</Label>
        <Textarea id="notes" {...register('notes')} placeholder="e.g., 1. Brush teeth..." />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Alarm'}
        </Button>
      </div>
    </form>
  );
};