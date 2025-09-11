import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DayOfWeekPicker } from './DayOfWeekPicker';
import { Plus, Trash2, Clock, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const scheduleItemSchema = z.object({
  time: z.string().min(1, 'Time is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

const scheduleTemplateSchema = z.object({
  template_name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  days_of_week: z.array(z.number().min(0).max(6)).min(1, 'At least one day must be selected'),
  items: z.array(scheduleItemSchema).min(1, 'At least one schedule item is required'),
});

export type ScheduleTemplateFormValues = z.infer<typeof scheduleTemplateSchema>;

interface ScheduleTemplateFormProps {
  onSubmit: (data: ScheduleTemplateFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<ScheduleTemplateFormValues>;
  isSubmitting: boolean;
}

export const ScheduleTemplateForm = ({ 
  onSubmit, 
  onCancel, 
  defaultValues, 
  isSubmitting 
}: ScheduleTemplateFormProps) => {
  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<ScheduleTemplateFormValues>({
    resolver: zodResolver(scheduleTemplateSchema),
    defaultValues: {
      template_name: '',
      description: '',
      days_of_week: [],
      items: [{ time: '', title: '', description: '' }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const addScheduleItem = () => {
    append({ time: '', title: '', description: '' });
  };

  const removeScheduleItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template_name">Template Name</Label>
            <Input
              id="template_name"
              {...register('template_name')}
              placeholder="e.g., Weekday Schedule, Weekend Schedule"
              className={cn(errors.template_name && "border-destructive")}
            />
            {errors.template_name && (
              <p className="text-red-500 text-sm">{errors.template_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe this schedule template..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Assign to Days of Week</Label>
            <Controller
              name="days_of_week"
              control={control}
              render={({ field }) => <DayOfWeekPicker value={field.value} onChange={field.onChange} />}
            />
            {errors.days_of_week && (
              <p className="text-red-500 text-sm">{errors.days_of_week.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Schedule Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addScheduleItem}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Item {index + 1}</span>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScheduleItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`items.${index}.time`}>Time</Label>
                    <Input
                      id={`items.${index}.time`}
                      type="time"
                      {...register(`items.${index}.time`)}
                      className={cn(errors.items?.[index]?.time && "border-destructive")}
                    />
                    {errors.items?.[index]?.time && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.time?.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={`items.${index}.title`}>Title</Label>
                    <Input
                      id={`items.${index}.title`}
                      {...register(`items.${index}.title`)}
                      placeholder="e.g., Morning Meeting"
                      className={cn(errors.items?.[index]?.title && "border-destructive")}
                    />
                    {errors.items?.[index]?.title && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.title?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor={`items.${index}.description`}>Description (optional)</Label>
                  <Textarea
                    id={`items.${index}.description`}
                    {...register(`items.${index}.description`)}
                    placeholder="Additional details..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
            <p className="text-red-500 text-sm mt-2">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </form>
  );
};
