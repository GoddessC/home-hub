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
import { Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Member removed.');
      queryClient.invalidateQueries({ queryKey: ['members', household?.id] });
    },
    onError: (error: Error) => {
      showError(`Failed to remove member: ${error.message}`);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Members</CardTitle>
        <CardDescription>Add or remove members from your household.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => addMemberMutation.mutate(data))} className="flex items-end gap-4 mb-6">
          <div className="flex-grow space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register('fullName')} placeholder="e.g., Jane Doe" className={cn(errors.fullName && "border-destructive")} />
            {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
          </div>
          <Button type="submit" disabled={addMemberMutation.isPending || isSubmitting}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </form>
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : members && members.length > 0 ? (
            <ul className="space-y-3">
              {members.map(member => (
                <li key={member.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    {member.role === 'OWNER' && <p className="text-xs text-muted-foreground">Owner</p>}
                  </div>
                  {member.role !== 'OWNER' && (
                    <Button variant="ghost" size="icon" onClick={() => deleteMemberMutation.mutate(member.id)} disabled={deleteMemberMutation.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No members added yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};