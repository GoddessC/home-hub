import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil, BellRing, BellOff } from 'lucide-react';
import { AlarmForm, AlarmFormValues } from './AlarmForm';
import { format, parse } from 'date-fns';

type Alarm = {
  id: string;
  name: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
  created_at: string;
};

const formatTime = (timeStr: string) => {
    try {
        const date = parse(timeStr, 'HH:mm:ss', new Date());
        return format(date, 'h:mm a');
    } catch (e) {
        return timeStr;
    }
};

const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.every(d => [1,2,3,4,5].includes(d))) return 'Weekdays';
    if (days.length === 0) return 'Does not repeat';
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayMap[d]).join(', ');
}

export const AlarmManagement = () => {
  const { household, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmFormValues | null>(null);

  const { data: alarms, isLoading } = useQuery({
    queryKey: ['alarms', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('alarms').select('*').eq('household_id', household.id).order('time');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const mutation = useMutation({
    mutationFn: async (values: AlarmFormValues) => {
      if (!household || !user) throw new Error("Not authorized");
      
      const dataToUpsert = {
        ...values,
        household_id: household.id,
        created_by: user.id,
        time: `${values.time}:00`, // Ensure seconds are present for DB
      };

      const { error } = await supabase.from('alarms').upsert(dataToUpsert);
      if (error) throw error;
    },
    onSuccess: (_, values) => {
      showSuccess(`Alarm "${values.name}" saved!`);
      queryClient.invalidateQueries({ queryKey: ['alarms', household?.id] });
      setFormOpen(false);
      setSelectedAlarm(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (alarmId: string) => {
        const { error } = await supabase.from('alarms').delete().eq('id', alarmId);
        if (error) throw error;
    },
    onSuccess: () => {
        showSuccess('Alarm deleted.');
        queryClient.invalidateQueries({ queryKey: ['alarms', household?.id] });
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleEdit = (alarm: any) => {
    const [hour, minute] = alarm.time.split(':');
    setSelectedAlarm({ ...alarm, time: `${hour}:${minute}` });
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedAlarm(null);
    setFormOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Alarm System</CardTitle>
            <CardDescription>Manage daily alarms for your household.</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Alarm
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : alarms && alarms.length > 0 ? (
            <ul className="space-y-3">
              {alarms.map(alarm => (
                <li key={alarm.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    {alarm.is_active ? <BellRing className="h-5 w-5 text-green-600" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                    <div>
                        <p className="font-bold text-lg">{formatTime(alarm.time)}</p>
                        <p className="font-medium">{alarm.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDays(alarm.days_of_week)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(alarm)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(alarm.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No alarms created yet.</p>
          )}
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAlarm ? 'Edit Alarm' : 'Create New Alarm'}</DialogTitle>
            <DialogDescription>Set up the details for your alarm.</DialogDescription>
          </DialogHeader>
          <AlarmForm
            onSubmit={(data) => mutation.mutate(data)}
            onCancel={() => setFormOpen(false)}
            defaultValues={selectedAlarm ?? undefined}
            isSubmitting={mutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};