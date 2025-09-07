import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Trash2, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const pairSchema = z.object({
  code: z.string().min(8, 'Code must be 8 characters.').max(8, 'Code must be 8 characters.'),
  displayName: z.string().min(2, 'Display name is required.'),
});
type PairFormValues = z.infer<typeof pairSchema>;

export const DeviceManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PairFormValues>({
    resolver: zodResolver(pairSchema),
  });

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('devices').select('*').eq('household_id', household.id).filter('revoked_at', 'is', null);
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const pairMutation = useMutation({
    mutationFn: async (values: PairFormValues) => {
      const { error } = await supabase.functions.invoke('pair-confirm', {
        body: { code: values.code, displayName: values.displayName },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess('Device paired successfully!');
      queryClient.invalidateQueries({ queryKey: ['devices', household?.id] });
      reset();
    },
    onError: (error: Error) => {
      showError(`Pairing failed: ${error.message}`);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
        const { error } = await supabase.functions.invoke('devices-revoke', {
            body: { deviceId },
        });
        if (error) throw new Error(error.message);
    },
    onSuccess: () => {
        showSuccess('Device access revoked.');
        queryClient.invalidateQueries({ queryKey: ['devices', household?.id] });
    },
    onError: (error: Error) => {
        showError(`Failed to revoke device: ${error.message}`);
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Collapsible defaultOpen={false}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Pair a New Kiosk</CardTitle>
              <CardDescription>Enter the 8-character code from your kiosk screen.</CardDescription>
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
              <form onSubmit={handleSubmit((data) => pairMutation.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Pairing Code</Label>
                  <Input 
                    id="code" 
                    {...register('code')} 
                    className={cn("font-mono uppercase", errors.code && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Device Name</Label>
                  <Input 
                    id="displayName" 
                    {...register('displayName')} 
                    placeholder="e.g., Kitchen Display" 
                    className={cn(errors.displayName && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.displayName && <p className="text-red-500 text-sm">{errors.displayName.message}</p>}
                </div>
                <Button type="submit" disabled={pairMutation.isPending || isSubmitting}>
                  {pairMutation.isPending ? 'Pairing...' : 'Pair Device'}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      <Collapsible defaultOpen={false}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Paired Devices</CardTitle>
              <CardDescription>Manage kiosks linked to your household.</CardDescription>
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
              {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : devices && devices.length > 0 ? (
                <ul className="space-y-3">
                  {devices.map(device => (
                    <li key={device.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-medium">{device.display_name}</p>
                        <p className="text-xs text-muted-foreground">Paired on {format(new Date(device.approved_at), 'PPP')}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => revokeMutation.mutate(device.id)} disabled={revokeMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No devices have been paired yet.</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};