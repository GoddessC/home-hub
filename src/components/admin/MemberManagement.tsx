import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, Member } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddMemberDialog, AddMemberFormValues } from '@/components/members/AddMemberDialog';
import { showError, showSuccess } from '@/utils/toast';
import { MemberAvatar } from '../avatar/MemberAvatar';
import { useState } from 'react';
import { AssignChoreDialog } from './AssignChoreDialog';

export const MemberManagement = () => {
  const { household } = useAuth();
  const queryClient = useQueryClient();
  const [assigningToMember, setAssigningToMember] = useState<Member | null>(null);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['members', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      const { data, error } = await supabase
        .from('members')
        .select(`*, member_avatar_config(config)`)
        .eq('household_id', household.id)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!household?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (values: AddMemberFormValues) => {
        if (!household?.id) throw new Error("Household not found");
        
        const { data: newMember, error } = await supabase.from('members').insert({
            ...values,
            household_id: household.id,
            role: 'CHILD',
        }).select().single();

        if (error) throw error;
        return newMember;
    },
    onSuccess: (newMember) => {
        if (!newMember) return;

        const base_head_url = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/head.png';
        const base_body_url = 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/body.png';
        
        const defaultConfig = {
            base_head: { id: 'default_head', asset_url: base_head_url },
            base_body: { id: 'default_body', asset_url: base_body_url },
            hair: null,
            shirt: null,
        };

        supabase.from('member_avatar_config').insert({
            member_id: newMember.id,
            config: defaultConfig,
        }).then(({ error }) => {
            if (error) {
                showError(`Failed to create avatar for new member: ${error.message}`);
            } else {
                showSuccess('Member added successfully!');
                queryClient.invalidateQueries({ queryKey: ['members', household?.id] });
            }
        });
    },
    onError: (error: Error) => showError(error.message),
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
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Household Members</CardTitle>
            <CardDescription>Add, remove, and manage members of your household.</CardDescription>
          </div>
          <AddMemberDialog onAddMember={addMemberMutation.mutate}>
              <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Member
              </Button>
          </AddMemberDialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : members && members.length > 0 ? (
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-4">
                    <MemberAvatar memberId={member.id} className="w-12 h-16" />
                    <span className="font-medium">{member.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAssigningToMember(member)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                    {member.role !== 'OWNER' && (
                      <Button variant="ghost" size="icon" onClick={() => deleteMemberMutation.mutate(member.id)} disabled={deleteMemberMutation.isPending}>
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No members found. Add one to get started!</p>
          )}
        </CardContent>
      </Card>
      {assigningToMember && (
        <AssignChoreDialog
          isOpen={!!assigningToMember}
          setOpen={(isOpen) => !isOpen && setAssigningToMember(null)}
          member={assigningToMember}
        />
      )}
    </>
  );
};