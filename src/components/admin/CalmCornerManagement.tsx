import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Sparkles, BarChart } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export const CalmCornerManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['calm_corner_logs', household?.id],
    queryFn: async () => {
        if (!household?.id) return [];
        const { data, error } = await supabase
            .from('calm_corner_log')
            .select('*')
            .eq('household_id', household.id)
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) throw error;
        return data;
    },
    enabled: !!household?.id,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      if (!household) throw new Error("Household not found.");
      const { error } = await supabase
        .from('households')
        .update({ is_calm_corner_enabled: isEnabled })
        .eq('id', household.id);
      if (error) throw error;
    },
    onSuccess: (_, isEnabled) => {
      showSuccess(`Calm Corner ${isEnabled ? 'enabled' : 'disabled'}.`);
      queryClient.invalidateQueries({ queryKey: ['authData'] });
      if (household) {
        const channel = supabase.channel(`household-updates-${household.id}`);
        channel.send({
            type: 'broadcast',
            event: 'household_settings_updated',
        });
      }
    },
    onError: (error: Error) => showError(error.message),
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
        if (!household) throw new Error("Household not found.");
        const { error } = await supabase.from('calm_corner_suggestions').insert({ household_id: household.id });
        if (error) throw error;
    },
    onSuccess: () => showSuccess("Suggestion sent to kiosks!"),
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>The Calm Corner</CardTitle>
        <CardDescription>Manage the guided breathing feature for your household kiosks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <Label htmlFor="calm-corner-switch" className="font-medium">Enable Calm Corner</Label>
          <Switch
            id="calm-corner-switch"
            checked={household?.is_calm_corner_enabled ?? false}
            onCheckedChange={(checked) => updateSettingMutation.mutate(checked)}
            disabled={updateSettingMutation.isPending}
          />
        </div>
        <Button 
            className="w-full" 
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending || !household?.is_calm_corner_enabled}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {suggestMutation.isPending ? 'Sending...' : 'Suggest a Calm Moment'}
        </Button>
        <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center"><BarChart className="h-4 w-4 mr-2" /> Recent Usage</h4>
            {isLoadingLogs ? <Skeleton className="h-24 w-full" /> : (
                logs && logs.length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {logs.map(log => (
                            <li key={log.id} className="flex justify-between">
                                <span>Used for {log.duration_seconds} seconds</span>
                                <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">The Calm Corner hasn't been used yet.</p>
                )
            )}
        </div>
      </CardContent>
    </Card>
  );
};