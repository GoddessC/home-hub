import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Separator } from '@/components/ui/separator';
import { UserNav } from '@/components/layout/UserNav';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  avatar_url: z.string().url().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { control, handleSubmit, setValue, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      avatar_url: profile?.avatar_url || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: Partial<ProfileFormValues>) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ ...updatedProfile, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showSuccess('Profile updated successfully!');
    },
    onError: (error) => {
      showError(`Failed to update profile: ${error.message}`);
    },
  });

  const handleAvatarUpload = (url: string) => {
    setValue('avatar_url', url, { shouldDirty: true });
    updateProfileMutation.mutate({ avatar_url: url });
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate({ full_name: data.full_name });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
       <header className="p-4 bg-white shadow-sm border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            <Link to="/">HomeHub</Link>
          </h1>
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline">
              <Link to="/">Back to Dashboard</Link>
            </Button>
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 flex justify-center items-start">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your personal information and avatar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <AvatarUpload onUpload={handleAvatarUpload} />
            <Separator />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
                <p className="text-sm text-muted-foreground">You cannot change your email address.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Controller
                  name="full_name"
                  control={control}
                  render={({ field }) => <Input id="full_name" {...field} />}
                />
                {errors.full_name && <p className="text-red-500 text-sm">{errors.full_name.message}</p>}
              </div>
              <CardFooter className="px-0">
                <Button type="submit" disabled={!isDirty || updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default ProfilePage;