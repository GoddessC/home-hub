import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';

const weatherSchema = z.object({
  weather_location: z.string().min(1, 'Location is required.'),
  weather_units: z.enum(['imperial', 'metric']),
});

type WeatherFormValues = z.infer<typeof weatherSchema>;

export const WeatherSettings = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, formState: { errors, isSubmitting, isDirty } } = useForm<WeatherFormValues>({
    resolver: zodResolver(weatherSchema),
    values: {
      weather_location: household?.weather_location ?? '',
      weather_units: (household?.weather_units as 'imperial' | 'metric') ?? 'imperial',
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (values: WeatherFormValues) => {
      if (!household) throw new Error("Household not found.");
      const { error } = await supabase
        .from('households')
        .update({ 
            weather_location: values.weather_location,
            weather_units: values.weather_units,
            weather_data: null, // Clear cached data on setting change
            weather_last_fetched: null,
        })
        .eq('id', household.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Weather settings updated!');
      queryClient.invalidateQueries({ queryKey: ['authData'] });
      queryClient.invalidateQueries({ queryKey: ['weather_data'] });
    },
    onError: (error: Error) => {
      showError(`Failed to update settings: ${error.message}`);
    },
  });

  return (
    <Collapsible defaultOpen>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Location & Weather</CardTitle>
            <CardDescription>Set your location to display local weather on the dashboard.</CardDescription>
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
            <form onSubmit={handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="weather_location">Location (ZIP Code or City, State)</Label>
                <Input 
                  id="weather_location" 
                  {...register('weather_location')} 
                  placeholder="e.g., 90210 or New York, NY"
                  className={cn(errors.weather_location && "border-destructive")}
                />
                {errors.weather_location && <p className="text-red-500 text-sm">{errors.weather_location.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Temperature Units</Label>
                <Controller
                  name="weather_units"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="imperial" id="imperial" />
                        <Label htmlFor="imperial">Fahrenheit (°F)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="metric" id="metric" />
                        <Label htmlFor="metric">Celsius (°C)</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>
              <Button type="submit" disabled={isSubmitting || updateSettingsMutation.isPending || !isDirty}>
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Weather Settings'}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};