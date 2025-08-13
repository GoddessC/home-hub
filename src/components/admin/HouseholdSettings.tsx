import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';

const settingsSchema = z.object({
  chore_reset_frequency: z.string(),
  chore_reset_day: z.coerce.number().min(0).max(6),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const resetFrequencies = [
    { value: 'NEVER', label: 'Never' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' },
];

export const HouseholdSettings = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { handleSubmit, setValue, watch, formState: { isSubmitting, isDirty } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      chore_reset_day: household?.chore_reset_day ?? 0,
      chore_reset_frequency: household?.chore_reset_frequency ?? 'WEEKLY',
    },
  });
  const chore_reset_day = watch('chore_reset_day');
  const chore_reset_frequency = watch('chore_reset_frequency');

  const updateSettingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      if (!household) throw new Error("Household not found.");
      const { error } = await supabase
        .from('households')
        .update({ 
            chore_reset_day: values.chore_reset_day,
            chore_reset_frequency: values.chore_reset_frequency,
        })
        .eq('id', household.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Settings updated successfully!');
      queryClient.invalidateQueries(); // Invalidate all to refetch auth context
      if (household) {
        const channel = supabase.channel(`household-updates-${household.id}`);
        channel.send({
            type: 'broadcast',
            event: 'household_settings_updated',
        });
      }
    },
    onError: (error: Error) => {
      showError(`Failed to update settings: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Settings</CardTitle>
        <CardDescription>Manage general settings for your household.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Point Reset Frequency</Label>
                    <Select onValueChange={(value) => setValue('chore_reset_frequency', value, { shouldDirty: true })} value={chore_reset_frequency}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            {resetFrequencies.map(freq => (
                                <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">How often member points should reset to zero.</p>
                </div>
                {chore_reset_frequency === 'WEEKLY' && (
                    <div className="space-y-2">
                        <Label>Weekly Reset Day</Label>
                        <Select onValueChange={(value) => setValue('chore_reset_day', Number(value), { shouldDirty: true })} value={String(chore_reset_day)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a day" />
                        </SelectTrigger>
                        <SelectContent>
                            {daysOfWeek.map(day => (
                            <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">The day on which weekly point totals are reset.</p>
                    </div>
                )}
            </div>
          <Button type="submit" disabled={updateSettingsMutation.isPending || isSubmitting || !isDirty}>
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};