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
  const { user, household } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
  });

  const onSubmit = async (data: HouseholdFormValues) => {
    if (!user || !household) {
      showError("Could not find your household to update.");
      return;
    }

    try {
      // UPDATE the household name and mark setup as complete
      const { error } = await supabase
        .from('households')
        .update({ name: data.name, is_setup_complete: true })
        .eq('id', household.id);

      if (error) throw error;

      showSuccess("Household setup complete! Redirecting to Admin Panel...");
      // Invalidate queries to force AuthContext to refetch user data
      await queryClient.invalidateQueries();
      
      // Redirect to the admin dashboard
      navigate('/admin', { replace: true });

    } catch (error: any) {
      showError(`Failed to update household: ${error.message}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome! Let's Set Up Your Household</CardTitle>
          <CardDescription>
            Give your household a name to get started. You can change this later.
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