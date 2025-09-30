import { useForm } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { defineStepper } from '@stepperize/react';
import { Trash2, Plus } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff } from 'lucide-react';
import { useRegistration } from '@/context/RegistrationContext';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.'),
  email: z.string().email('A valid email is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/\d/, 'Password must contain at least one number.'),
  householdName: z.string().min(2, 'Please enter a household name.'),
  zipCode: z
    .string()
    .regex(/^\d{5}$/, 'Zip code must be exactly 5 digits')
    .optional(),
  features: z.object({
    weather: z.boolean().default(false),
    calmCorner: z.boolean().default(false),
    dailySchedules: z.boolean().default(false),
    pointSystem: z.boolean().default(false),
    alarms: z.boolean().default(false),
    announcements: z.boolean().default(false),
    feelingsCheckins: z.boolean().default(false),
    teamQuests: z.boolean().default(false),
    chores: z.boolean().default(false),
    rewardsStore: z.boolean().default(false),
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Stepperize configuration
const { useStepper, utils } = defineStepper(
  {
    id: 'account',
    title: 'Account',
    description: 'Create your account',
  },
  {
    id: 'household',
    title: 'Household',
    description: 'Set up your household',
  },
  {
    id: 'features',
    title: 'Features',
    description: 'Choose your features',
  }
);

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  size?: number;
  strokeWidth?: number;
}

const StepIndicator = ({ currentStep, totalSteps, size = 80, strokeWidth = 6 }: StepIndicatorProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const fillPercentage = (currentStep / totalSteps) * 100;
  const dashOffset = circumference - (circumference * fillPercentage) / 100;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <title>Step Indicator</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-primary transition-all duration-300 ease-in-out"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-medium" aria-live="polite">
          {currentStep} of {totalSteps}
        </span>
      </div>
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailTaken, setIsEmailTaken] = useState(false);
  const [additionalMembers, setAdditionalMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const { register, handleSubmit, reset, trigger, watch, setValue, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      features: {
        weather: false,
        calmCorner: false,
        dailySchedules: false,
        pointSystem: false,
        alarms: false,
        announcements: false,
        feelingsCheckins: false,
        teamQuests: false,
        chores: false,
        rewardsStore: false,
      }
    }
  });
  const stepper = useStepper();
  const currentIndex = utils.getIndex(stepper.current.id);
  const watchedFeatures = watch('features');

  // Debug stepper state changes
  useEffect(() => {
    console.log('Stepper state changed:', {
      currentId: stepper.current.id,
      currentIndex
    });
  }, [stepper.current.id, currentIndex]);

  // Use RegistrationContext instead of AuthContext
  const { user, isGoogleUser, setIsGoogleUser } = useRegistration();
  const isCompletingRegistrationRef = useRef(false);

  useEffect(() => {
    if (user && !user.is_anonymous && !isGoogleUser) {
      setIsGoogleUser(true);
      // Pre-fill form with Google user data
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const email = user.email || '';
      
      setValue('fullName', fullName);
      setValue('email', email);
      
      // Start at household step (step 2)
      stepper.goTo('household');
      
      // Set flags to prevent AuthContext from redirecting
      localStorage.setItem('isCompletingRegistration', 'true');
      isCompletingRegistrationRef.current = true;
      // Set global flag for AuthContext
      (window as any).isCompletingRegistration = true;
      
      // Force disable AuthContext query by setting a global flag
      (window as any).disableAuthContext = true;
    }
  }, [user, setValue, setIsGoogleUser, isGoogleUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      (window as any).disableAuthContext = false;
    };
  }, []);

  // Input sanitization to prevent injection attacks
  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes that could break SQL
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/[--]/g, '') // Remove SQL comment markers
      .substring(0, 100); // Limit length
  };

  const addMember = () => {
    const sanitizedName = sanitizeInput(newMemberName);
    if (sanitizedName.length < 2) return;
    
    const newMember = {
      id: Date.now().toString(),
      name: sanitizedName
    };
    
    setAdditionalMembers(prev => [...prev, newMember]);
    setNewMemberName('');
  };

  const removeMember = (id: string) => {
    setAdditionalMembers(prev => prev.filter(member => member.id !== id));
  };

  const handleNewMemberNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value);
    setNewMemberName(sanitized);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    console.log('Form submitted with data:', data);
    console.log('Is Google user:', isGoogleUser);
    
    if (isGoogleUser) {
      // Google user - create household and complete setup
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showError('You must be signed in with Google to complete setup.');
          return;
        }

        // Create household with owner via RPC
        const rawFullName = data.fullName || 'Owner';
        const ownerFirst = rawFullName.split(' ')[0] || 'Owner';
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_household_with_owner', {
          p_name: data.householdName,
          p_owner_user_id: user.id,
          p_owner_full_name: ownerFirst,
        });
        if (rpcError) throw rpcError;
        const householdId = rpcResult as unknown as string;

        // Mark setup complete and save zip and features if provided
        const updatePayload: Record<string, any> = { 
          is_setup_complete: true,
          features: data.features
        };
        if (data.zipCode) updatePayload.weather_location = data.zipCode;
        const { error: updateError } = await supabase.from('households').update(updatePayload).eq('id', householdId);
        if (updateError) throw updateError;

        // Insert additional members
        if (additionalMembers.length > 0) {
          const { error: insertErr } = await supabase.from('members').insert(
            additionalMembers.map(m => ({ household_id: householdId, full_name: m.name, role: 'CHILD' }))
          );
          if (insertErr) throw insertErr;
        }

        showSuccess('Account setup complete!');
        localStorage.removeItem('isCompletingRegistration');
        isCompletingRegistrationRef.current = false;
        (window as any).isCompletingRegistration = false;
        (window as any).disableAuthContext = false;
        navigate('/');
      } catch (err: any) {
        showError(err.message || 'Failed to complete setup.');
      }
    } else {
      // Regular registration
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (error) {
        showError(error.message);
      } else {
        showSuccess('Registration successful! Please check your email to verify your account.');
        reset();
        navigate('/login');
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Sign up to create and manage your household.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stepperize circular stepper header */}
          <div className="mb-8 flex items-center gap-4">
            <StepIndicator currentStep={currentIndex + 1} totalSteps={stepper.all.length} />
            <div className="flex flex-col">
              <h2 className="flex-1 text-lg font-medium">{stepper.current.title}</h2>
              <p className="text-sm text-muted-foreground">{stepper.current.description}</p>
            </div>
          </div>

          {stepper.switch({
            account: () => (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Validate all fields first
                  const isValid = await trigger(['fullName', 'email', 'password']);
                  if (!isValid) return;
                  
                  // Check if email exists in database
                  const email = watch('email')?.trim().toLowerCase();
                  if (email) {
                    try {
                      setIsCheckingEmail(true);
                      const res = await fetch('/functions/v1/check-email-exists?email=' + encodeURIComponent(email));
                      const json = await res.json();
                      if (json?.exists) {
                        setIsEmailTaken(true);
                        setError('email', { type: 'manual', message: 'Email already in use.' });
                        return;
                      } else {
                        setIsEmailTaken(false);
                        clearErrors('email');
                      }
                    } catch (_err) {
                      // On network error, allow progression
                      setIsEmailTaken(false);
                    } finally {
                      setIsCheckingEmail(false);
                    }
                  }
                  
                  // All validations passed, proceed to next step
                  stepper.next();
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    {...register('fullName', { onBlur: () => trigger('fullName') })}
                    className={cn(errors.fullName && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', {
                      onBlur: async (e) => {
                        const value = e.target.value?.trim().toLowerCase();
                        await trigger('email');
                        if (!value || errors.email) return;
                        try {
                          setIsCheckingEmail(true);
                          const res = await fetch('/functions/v1/check-email-exists?email=' + encodeURIComponent(value));
                          const json = await res.json();
                          if (json?.exists) {
                            setIsEmailTaken(true);
                            setError('email', { type: 'manual', message: 'Email already in use.' });
                          } else {
                            setIsEmailTaken(false);
                            clearErrors('email');
                          }
                        } catch (_err) {
                          // On network error, do not block progression
                          setIsEmailTaken(false);
                        } finally {
                          setIsCheckingEmail(false);
                        }
                      },
                      onChange: () => {
                        setIsEmailTaken(false);
                        clearErrors('email');
                      },
                    })}
                    className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {(errors.email || isEmailTaken) && (
                    <p className="text-red-500 text-sm">{errors.email?.message || 'Email already in use.'}</p>
                  )}
                  {isCheckingEmail && (
                    <p className="text-xs text-muted-foreground">Checking email…</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { onBlur: () => trigger('password') })}
                      className={cn('pr-10', errors.password && 'border-destructive focus-visible:ring-destructive')}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters and include at least one number.</p>
                  {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="submit" disabled={!!errors.fullName || !!errors.email || !!errors.password || isEmailTaken || isCheckingEmail}>
                    {isCheckingEmail ? 'Checking...' : 'Next'}
                  </Button>
                </div>
              </form>
            ),
            household: () => (
              <form
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log('Household form submitted');
                  console.log('Current step before next:', stepper.current.id);
                  console.log('Form data:', { householdName: watch('householdName'), zipCode: watch('zipCode'), additionalMembers });
                  
                  // Check if required fields are filled
                  if (!watch('householdName')?.trim()) {
                    console.log('Household name is required');
                    return;
                  }
                  
                  // Check for any form errors
                  const formErrors = Object.keys(errors);
                  if (formErrors.length > 0) {
                    console.log('Form has errors:', formErrors, errors);
                    return;
                  }
                  
                  console.log('Attempting to go to next step...');
                  
                  // Try using stepper.goTo to features step
                  stepper.goTo('features');
                  console.log('Used goTo features, current step:', stepper.current.id);
                  
                  // Use setTimeout to check the step after the state update
                  setTimeout(() => {
                    console.log('Current step after navigation (delayed):', stepper.current.id);
                  }, 100);
                }}
                className="space-y-6"
              >
                {isGoogleUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-blue-800 mb-2">
                      Welcome! Please complete your household setup to finish creating your account.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('isCompletingRegistration');
                        (window as any).isCompletingRegistration = false;
                        (window as any).disableAuthContext = false;
                        supabase.auth.signOut().then(() => {
                          navigate('/login');
                        });
                      }}
                      className="text-blue-800 border-blue-300 hover:bg-blue-100"
                    >
                      Back to Login
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="householdName">Household Name</Label>
                  <Input
                    id="householdName"
                    type="text"
                    autoComplete="off"
                    {...register('householdName', { onBlur: () => trigger('householdName') })}
                    className={cn(errors.householdName && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {errors.householdName && <p className="text-red-500 text-sm">{errors.householdName.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code (Optional)</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    title="Enter a 5-digit ZIP code"
                    maxLength={5}
                    onInput={(e) => {
                      const t = e.target as HTMLInputElement;
                      t.value = t.value.replace(/[^0-9]/g, '').slice(0, 5);
                    }}
                    {...register('zipCode')}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">For accurate weather details. You can add this later in settings.</p>
                </div>

                <div className="rounded-md border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Household Members</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    You are automatically added as the first member. Add other family members below.
                  </p>
                  
                  {/* Account Owner */}
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      1
                    </div>
                    <span className="font-medium">You (Account Owner)</span>
                  </div>

                  {/* Additional Members */}
                  {additionalMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm mb-2">
                      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium">
                        {index + 2}
                      </div>
                      <span className="font-medium flex-1">{member.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Add Member Input */}
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Enter member name"
                      value={newMemberName}
                      onChange={handleNewMemberNameChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addMember();
                        }
                      }}
                      className="flex-1"
                      maxLength={100}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMember}
                      disabled={newMemberName.length < 2}
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Enter or click + to add member
                  </p>
                </div>

                <div className="flex justify-between gap-4">
                  {!isGoogleUser && (
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={(e) => {
                        e.preventDefault();
                        stepper.prev();
                      }}
                    >
                      Back
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={!!errors.householdName}
                    className={isGoogleUser ? "ml-auto" : ""}
                  >
                    Next
                  </Button>
                </div>
              </form>
            ),
            features: () => (
              <form onSubmit={(e) => {
                console.log('Form submit event triggered');
                console.log('Form errors:', errors);
                console.log('Form is valid:', Object.keys(errors).length === 0);
                handleSubmit(onSubmit)(e);
              }} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose which features you'd like to enable for your household. You can change these later in settings.
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allFeatures = {
                          weather: true,
                          calmCorner: true,
                          dailySchedules: true,
                          pointSystem: true,
                          alarms: true,
                          announcements: true,
                          feelingsCheckins: true,
                          teamQuests: true,
                          chores: true,
                          rewardsStore: true,
                        };
                        Object.keys(allFeatures).forEach(key => {
                          setValue(`features.${key}` as any, true);
                        });
                      }}
                    >
                      Select All
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'weather', label: 'Weather', description: 'Local weather updates' },
                      { key: 'calmCorner', label: 'Calm Corner', description: 'Mindfulness and relaxation' },
                      { key: 'dailySchedules', label: 'Daily Schedules', description: 'Family scheduling' },
                      { key: 'pointSystem', label: 'Point System', description: 'Reward points for tasks' },
                      { key: 'alarms', label: 'Alarms', description: 'Family reminders' },
                      { key: 'announcements', label: 'Announcements', description: 'Family messages' },
                      { key: 'feelingsCheckins', label: 'Feelings Check-ins', description: 'Emotional wellness' },
                      { key: 'teamQuests', label: 'Team Quests', description: 'Family challenges' },
                      { key: 'chores', label: 'Chores & Tasks', description: 'Household tasks' },
                      { key: 'rewardsStore', label: 'Rewards Store', description: 'Spend earned points' },
                    ].map((feature) => (
                      <button
                        key={feature.key}
                        type="button"
                        onClick={() => setValue(`features.${feature.key}` as any, !watchedFeatures[feature.key as keyof typeof watchedFeatures])}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          watchedFeatures[feature.key as keyof typeof watchedFeatures]
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-muted bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <div className="font-medium text-sm">{feature.label}</div>
                        <div className="text-xs opacity-75 mt-1">{feature.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between gap-4">
                  <Button type="button" variant="secondary" onClick={stepper.prev}>
                    Back
                  </Button>
                  <Button type="submit" className="min-w-28" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            ),
          })}

          {stepper.current.id === 'account' && (
            <>
              <Separator className="my-6" />
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                >
                  Continue with Google
                </Button>
              </div>
            </>
          )}
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