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
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

const registerSchema = z.object({
  householdName: z.string().min(3, 'Household name is required.'),
  // Admin details
  adminFullName: z.string().min(2, 'Your name is required.'),
  adminEmail: z.string().email('A valid admin email is required.'),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters.'),
  // Family Dashboard details
  familyEmail: z.string().email('A valid family email is required.'),
  familyPassword: z.string().min(8, 'Family password must be at least 8 characters.'),
  // Member names
  members: z.array(memberSchema).max(10, 'You can add a maximum of 10 members.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      members: [{ name: '' }],
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
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create your HomeHub</CardTitle>
          <CardDescription>
            Set up your household with an admin account and a shared family dashboard account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input id="householdName" {...register('householdName')} placeholder="e.g., The Miller Home" />
              {errors.householdName && <p className="text-red-500 text-sm">{errors.householdName.message}</p>}
            </div>

            <Separator />

            {/* Admin Account */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-medium">Admin Account Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFullName">Your Full Name (Admin)</Label>
                  <Input id="adminFullName" {...register('adminFullName')} />
                  {errors.adminFullName && <p className="text-red-500 text-sm">{errors.adminFullName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Your Email (Admin)</Label>
                  <Input id="adminEmail" type="email" {...register('adminEmail')} />
                  {errors.adminEmail && <p className="text-red-500 text-sm">{errors.adminEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input id="adminPassword" type="password" {...register('adminPassword')} />
                  {errors.adminPassword && <p className="text-red-500 text-sm">{errors.adminPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* Family Dashboard Account */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-medium">Shared Family Dashboard Account Setup</h3>
               <p className="text-sm text-muted-foreground">This is the single account all family members will use to view the shared dashboard.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="familyEmail">Family Email</Label>
                  <Input id="familyEmail" type="email" {...register('familyEmail')} />
                  {errors.familyEmail && <p className="text-red-500 text-sm">{errors.familyEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="familyPassword">Family Password</Label>
                  <Input id="familyPassword" type="password" {...register('familyPassword')} />
                  {errors.familyPassword && <p className="text-red-500 text-sm">{errors.familyPassword.message}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Add Members Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Add Family Members</h3>
                  <p className="text-sm text-muted-foreground">Add the names of people in your household.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: '' })}
                  disabled={fields.length >= 10}
                >
                  Add Member
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4">
                  <div className="flex-grow space-y-2">
                    <Label htmlFor={`members.${index}.name`} className="sr-only">Member Name</Label>
                    <Input {...register(`members.${index}.name`)} placeholder={`Member ${index + 1} Name`} />
                    {errors.members?.[index]?.name && <p className="text-red-500 text-sm">{errors.members?.[index]?.name?.message}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Household...' : 'Create Household & Accounts'}
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