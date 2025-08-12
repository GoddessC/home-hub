import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Megaphone, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const announcementSchema = z.object({
  message: z.string().min(3, 'Announcement must be at least 3 characters.').max(500, 'Announcement cannot exceed 500 characters.'),
});
type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export const AnnouncementManagement = () => {
  const { household, user } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('announcements').select('*').eq('household_id', household.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', household?.id] });
      queryClient.invalidateQueries({ queryKey: ['active_announcement', household?.id] });
    },
    onError: (error: Error) => showError(error.message),
  };

  const addMutation = useMutation({
    ...mutationOptions,
    mutationFn: async (values: AnnouncementFormValues) => {
      if (!household || !user) throw new Error("User or household not found.");
      const { error } = await supabase.from('announcements').insert({
        household_id: household.id,
        created_by: user.id,
        message: values.message,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Announcement posted!');
      reset();
      mutationOptions.onSuccess();
    },
  });

  const deleteMutation = useMutation({
    ...mutationOptions,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Announcement deleted.');
      mutationOptions.onSuccess();
    },
  });

  const setActiveMutation = useMutation({
    ...mutationOptions,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').update({ is_active: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Announcement is now active.');
      mutationOptions.onSuccess();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Announcements</CardTitle>
        <CardDescription>Post messages that will appear on all dashboards.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => addMutation.mutate(data))} className="space-y-4 mb-8">
          <div className="space-y-2">
            <Label htmlFor="message">New Announcement</Label>
            <Textarea id="message" {...register('message')} placeholder="e.g., Movie night is at 7 PM tonight!" className={cn(errors.message && "border-destructive")} />
            {errors.message && <p className="text-red-500 text-sm">{errors.message.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting || addMutation.isPending}>
            <Megaphone className="h-4 w-4 mr-2" />
            {addMutation.isPending ? 'Posting...' : 'Post Announcement'}
          </Button>
        </form>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4">History</h4>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : announcements && announcements.length > 0 ? (
            <ul className="space-y-3">
              {announcements.map(ann => (
                <li key={ann.id} className={cn("flex items-start justify-between p-3 rounded-lg", ann.is_active ? "bg-green-100 border border-green-200" : "bg-secondary")}>
                  <div>
                    <p className="font-medium">{ann.message}</p>
                    <p className="text-xs text-muted-foreground">Posted on {format(new Date(ann.created_at), 'PPP p')}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                    {ann.is_active ? (
                      <span className="flex items-center text-xs text-green-700 font-semibold mr-2"><CheckCircle className="h-4 w-4 mr-1" /> Active</span>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setActiveMutation.mutate(ann.id)} disabled={setActiveMutation.isPending}>Make Active</Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ann.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No announcements have been posted yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};