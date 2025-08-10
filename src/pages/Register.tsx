import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const registerSchema = z.object({
  householdName: z.string().min(3, 'Household name must be at least 3 characters.'),
  adminFullName: z.string().min(2, 'Your name must be at least 2 characters.'),
  adminEmail: z.string().email('Please enter a valid email address.'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    const toastId = showLoading('Creating your household...');
    try {
      const { error } = await supabase.functions.invoke('create-household', {
        body: data,
      });

      if (error) {
        throw new Error(error.message);
      }
      
      dismissToast(toastId);
      showSuccess('Household created! Please log in.');
      navigate('/login');

    } catch (error: any) {
      dismissToast(toastId);
      const errorMessage = error.context?.error_description || error.message || 'An unknown error occurred.';
      showError(`Registration failed: ${errorMessage}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create your HomeHub</CardTitle>
          <CardDescription>
            Start by creating a household account. You'll be the admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input id="householdName" {...register('householdName')} placeholder="e.g., The Miller Home" />
              {errors.householdName && <p className="text-red-500 text-sm">{errors.householdName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminFullName">Your Full Name</Label>
              <Input id="adminFullName" {...register('adminFullName')} placeholder="e.g., Jane Miller" />
              {errors.adminFullName && <p className="text-red-500 text-sm">{errors.adminFullName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Your Email</Label>
              <Input id="adminEmail" type="email" {...register('adminEmail')} placeholder="you@example.com" />
              {errors.adminEmail && <p className="text-red-500 text-sm">{errors.adminEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password</Label>
              <Input id="adminPassword" type="password" {...register('adminPassword')} />
              {errors.adminPassword && <p className="text-red-500 text-sm">{errors.adminPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Household'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;