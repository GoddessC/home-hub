import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { FeelingsChart } from './FeelingsChart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';

const settingsSchema = z.object({
  is_feelings_enabled: z.boolean(),
  feelings_morning_time: z.string().nullable(),
  feelings_evening_time: z.string().nullable(),
  feelings_notify_on_negative: z.boolean(),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;

export const FeelingsManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { control, handleSubmit, watch, formState: { isSubmitting, isDirty } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      is_feelings_enabled: household?.is_feelings_enabled ?? false,
      feelings_morning_time: household?.feelings_morning_time ?? null,
      feelings_evening_time: household?.feelings_evening_time ?? null,
      feelings_notify_on_negative: household?.feelings_notify_on_negative ?? false,
    },
  });

  const isEnabled = watch('is_feelings_enabled');

  const updateSettingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      if (!household) throw new Error("Household not found.");
      const { error } = await supabase
        .from('households')
        .update({
          is_feelings_enabled: values.is_feelings_enabled,
          feelings_morning_time: values.feelings_morning_time || null,
          feelings_evening_time: values.feelings_evening_time || null,
          feelings_notify_on_negative: values.feelings_notify_on_negative,
        })
        .eq('id', household.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Feelings Check-in settings updated!');
      queryClient.invalidateQueries({ queryKey: ['authData'] });
    },
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Collapsible defaultOpen>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Daily Feelings Check-in</CardTitle>
            <CardDescription>Configure prompts for household members to log their feelings.</CardDescription>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-8">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="is_feelings_enabled" className="font-medium">Enable Feelings Check-in</Label>
                <Controller
                  name="is_feelings_enabled"
                  control={control}
                  render={({ field }) => <Switch id="is_feelings_enabled" checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>

              {isEnabled && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="feelings_morning_time">Morning Check-in Time</Label>
                      <Controller
                        name="feelings_morning_time"
                        control={control}
                        render={({ field }) => <Input id="feelings_morning_time" type="time" {...field} value={field.value ?? ''} />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feelings_evening_time">Evening Check-in Time</Label>
                      <Controller
                        name="feelings_evening_time"
                        control={control}
                        render={({ field }) => <Input id="feelings_evening_time" type="time" {...field} value={field.value ?? ''} />}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="feelings_notify_on_negative" className="font-medium">Negative Streak Notifications</Label>
                        <p className="text-sm text-muted-foreground">Get a notification after 2 consecutive 'Sad' or 'Angry' check-ins.</p>
                    </div>
                    <Controller
                      name="feelings_notify_on_negative"
                      control={control}
                      render={({ field }) => <Switch id="feelings_notify_on_negative" checked={field.value} onCheckedChange={field.onChange} />}
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Feelings Chart</h4>
                    <FeelingsChart />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting || updateSettingsMutation.isPending || !isDirty}>
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};