import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Trash2, PlusCircle } from 'lucide-react';

const householdSchema = z.object({
  name: z.string().min(3, 'Household name must be at least 3 characters.'),
  members: z.array(z.object({
    full_name: z.string().min(2, 'Member name must be at least 2 characters.'),
  })).optional(),
});

type HouseholdFormValues = z.infer<typeof householdSchema>;

const CreateHousehold = () => {
  const { user, household } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
        members: [{ full_name: '' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  const onSubmit = async (data: HouseholdFormValues) => {
    if (!user) {
      showError("You must be signed in to create a household.");
      return;
    }

    try {
      // Ensure a household exists. If not, create one and make the current user the OWNER member.
      let householdId = household?.id ?? null;

      if (!householdId) {
        const rawFullName = (user.user_metadata as any)?.full_name as string | undefined;
        const ownerFullName = rawFullName ? rawFullName.split(' ')[0] : 'Owner';
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_household_with_owner', {
          p_name: data.name,
          p_owner_user_id: user.id,
          p_owner_full_name: ownerFullName,
        });
        if (rpcError) throw rpcError;
        householdId = rpcResult as unknown as string;
      }

      // Update household name (in case of existing household) and mark setup complete
      // Name already set and setup completed inside RPC for new households.
      // For existing households, still ensure name + setup flag are saved.
      if (household) {
        const { error: updateError } = await supabase
          .from('households')
          .update({ name: data.name, is_setup_complete: true })
          .eq('id', householdId as string);
        if (updateError) throw updateError;
      }

      // Insert new child members if any were added
      if (data.members && data.members.length > 0) {
        const newMembers = data.members
          .filter(member => member.full_name.trim() !== '')
          .map(member => ({
            household_id: householdId as string,
            full_name: member.full_name,
            role: 'CHILD' as const,
          }));

        if (newMembers.length > 0) {
          const { error: memberError } = await supabase.from('members').insert(newMembers);
          if (memberError) throw memberError;
        }
      }

      showSuccess("Household setup complete! Redirecting to Admin Panel...");
      await queryClient.invalidateQueries();
      navigate('/admin', { replace: true });
    } catch (error: any) {
      showError(`Failed to update household: ${error.message}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome! Let's Set Up Your Household</CardTitle>
          <CardDescription>
            Give your household a name and add your members to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Household Name</Label>
              <Input 
                id="name" 
                {...register('name')} 
                placeholder="e.g., The Smith Family" 
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                defaultValue={household?.name}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>

            <div className="space-y-4">
                <Label>Add Your Household Members (Optional)</Label>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Input
                            {...register(`members.${index}.full_name`)}
                            placeholder={`Member #${index + 1} Full Name`}
                            className={cn(errors.members?.[index]?.full_name && "border-destructive")}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
                {errors.members && <p className="text-red-500 text-sm">Please correct the errors in member names.</p>}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ full_name: '' })}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Another Member
                </Button>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save and Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateHousehold;