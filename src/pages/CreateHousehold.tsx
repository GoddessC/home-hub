import { useForm } from 'react-hook-form';
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

const householdSchema = z.object({
  name: z.string().min(3, 'Household name must be at least 3 characters.'),
});

type HouseholdFormValues = z.infer<typeof householdSchema>;

const CreateHousehold = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
  });

  const onSubmit = async (data: HouseholdFormValues) => {
    if (!user || !profile) {
      showError("You must be logged in to create a household.");
      return;
    }

    try {
      // 1. Create the household. The `created_by` field is now set automatically by the database.
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({ name: data.name })
        .select()
        .single();

      if (householdError) throw householdError;

      // 2. Add the user as the OWNER
      const { error: memberError } = await supabase
        .from('members')
        .insert({ 
            user_id: user.id, 
            household_id: householdData.id, 
            role: 'OWNER',
            full_name: profile.full_name || 'Household Owner'
        });

      if (memberError) throw memberError;

      showSuccess("Household created! Now, let's pair your first kiosk.");
      // Invalidate queries to force AuthContext to refetch user data
      await queryClient.invalidateQueries();
      
      // Redirect to the admin page to pair a device
      navigate('/admin', { replace: true });

    } catch (error: any) {
      showError(`Failed to create household: ${error.message}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Household</CardTitle>
          <CardDescription>
            Give your household a name to get started.
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
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Household'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateHousehold;