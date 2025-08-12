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
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemberStatsCard } from './MemberStatsCard';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
});
type MemberFormValues = z.infer<typeof memberSchema>;

export const MemberManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase.from('members').select('*').eq('household_id', household.id).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      if (!household) throw new Error("Household not found.");
      // Add new members with a default role of 'CHILD'
      const { error } = await supabase.from('members').insert({
        household_id: household.id,
        full_name: values.fullName,
        role: 'CHILD',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Member added successfully!');
      queryClient.invalidateQueries({ queryKey: ['members', household?.id] });
      reset();
    },
    onError: (error: Error) => {
      showError(`Failed to add member: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Members</CardTitle>
        <CardDescription>Add or remove members and view their point totals.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => addMemberMutation.mutate(data))} className="flex items-end gap-4 mb-8">
          <div className="flex-grow space-y-2">
            <Label htmlFor="fullName">New Member's Full Name</Label>
            <Input id="fullName" {...register('fullName')} placeholder="e.g., Jane Doe" className={cn(errors.fullName && "border-destructive")} />
            {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
          </div>
          <Button type="submit" disabled={addMemberMutation.isPending || isSubmitting}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </form>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
          ) : members && members.length > 0 ? (
            members.map(member => (
              <MemberStatsCard key={member.id} member={member} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 col-span-full">No members added yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};