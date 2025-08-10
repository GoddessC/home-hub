import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';

const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const registerSchema = z.object({
  householdName: z.string().min(3, 'Household name must be at least 3 characters.'),
  adminFullName: z.string().min(2, 'Your name must be at least 2 characters.'),
  adminEmail: z.string().email('Please enter a valid email address.'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters.'),
  members: z.array(memberSchema).max(5, 'You can add a maximum of 5 members.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      members: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "members"
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
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create your HomeHub</CardTitle>
          <CardDescription>
            Start by creating a household account. You'll be the admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Admin and Household Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>

            <Separator />

            {/* Add Members Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Add Family Members</h3>
                  <p className="text-sm text-muted-foreground">You can add up to 5 members now. You can add more later.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ fullName: '', email: '', password: '' })}
                  disabled={fields.length >= 5}
                >
                  Add Member
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`members.${index}.fullName`}>Full Name</Label>
                      <Input {...register(`members.${index}.fullName`)} />
                      {errors.members?.[index]?.fullName && <p className="text-red-500 text-sm">{errors.members?.[index]?.fullName?.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`members.${index}.email`}>Email</Label>
                      <Input type="email" {...register(`members.${index}.email`)} />
                      {errors.members?.[index]?.email && <p className="text-red-500 text-sm">{errors.members?.[index]?.email?.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`members.${index}.password`}>Temporary Password</Label>
                      <Input type="password" {...register(`members.${index}.password`)} />
                      {errors.members?.[index]?.password && <p className="text-red-500 text-sm">{errors.members?.[index]?.password?.message}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
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