import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Household {
  id: string;
  name: string;
  is_setup_complete: boolean;
  chore_reset_day: number;
  chore_reset_frequency: string;
  is_calm_corner_enabled: boolean;
  is_feelings_enabled: boolean;
  feelings_morning_time: string | null;
  feelings_evening_time: string | null;
  feelings_notify_on_negative: boolean;
  // FIX: Added missing properties to the Household type definition.
  weather_location: string | null;
  weather_units: string;
  alarm_snooze_enabled: boolean;
}

export interface Member {
  id:string;
  household_id: string;
  user_id: string | null;
  full_name: string;
  role: 'OWNER' | 'ADULT' | 'CHILD';
}

export interface Device {
    id: string;
    household_id: string;
    display_name: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  // FIX: Added missing 'role' property to the Profile type definition.
  role?: 'admin' | 'user';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  member: Member | null;
  household: Household | null;
  device: Device | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInAsKiosk: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasRedirectedToFinish, setHasRedirectedToFinish] = useState(false);
  const [isCompletingRegistration, setIsCompletingRegistration] = useState(() => {
    return localStorage.getItem('isCompletingRegistration') === 'true';
  });

  // Clear redirect state when user navigates away from register
  useEffect(() => {
    const handleRouteChange = () => {
      if (!window.location.pathname.includes('/register')) {
        setHasRedirectedToFinish(false);
        setIsCompletingRegistration(false);
        localStorage.removeItem('isCompletingRegistration');
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if we should disable auth context completely
    const isOnRegisterPage = typeof window !== 'undefined' && window.location.pathname.includes('/register');
    const isAuthContextDisabled = typeof window !== 'undefined' && (window as any).disableAuthContext;
    
    if (isOnRegisterPage || isAuthContextDisabled) {
      setAuthLoading(false);
      return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Check if we're on register page - if so, don't run the query at all
  const isOnRegisterPage = typeof window !== 'undefined' && window.location.pathname.includes('/register');
  const isCompletingRegistrationGlobal = typeof window !== 'undefined' && (window as any).isCompletingRegistration;
  const isAuthContextDisabled = typeof window !== 'undefined' && (window as any).disableAuthContext;
  
  const { data, isLoading: dataLoading, error: queryError } = useQuery({
    queryKey: ['authData', user?.id],
    queryFn: async () => {
      if (!user) return null;

      if (user.is_anonymous) {
        const { data: deviceData, error } = await supabase
          .from('devices')
          .select('*, household:households(*)')
          .eq('kiosk_user_id', user.id)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return { device: deviceData ?? null, household: deviceData?.household ?? null, member: null, profile: null };
      }

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, household:households(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (memberError && memberError.code !== 'PGRST116') throw memberError;
      if (!memberData) {
        // Authenticated (e.g., Google) user without member/household → finish signup flow
        // Only redirect if not already on register page and not completing registration
        const isCompleting = isCompletingRegistration || isCompletingRegistrationGlobal;
        if (!isOnRegisterPage && !isCompleting) {
          setHasRedirectedToFinish(true);
          window.location.href = '/register';
        }
        // Return null instead of throwing error to prevent query retries
        return null;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      return {
        member: memberData,
        household: memberData.household,
        profile: profileData,
        device: null,
      };
    },
    enabled: !authLoading && !!user && !isOnRegisterPage && !isCompletingRegistrationGlobal && !isAuthContextDisabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on error
  });

  const householdId = data?.household?.id;

  useEffect(() => {
    if (!householdId || !user?.id) return;

    const channel = supabase.channel(`household-updates-${householdId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'households',
          filter: `id=eq.${householdId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['authData', user.id] });
        }
      )
      .on(
        'broadcast',
        { event: 'household_settings_updated' },
        () => {
            queryClient.invalidateQueries({ queryKey: ['authData', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, user?.id, queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInAsKiosk = async () => {
    await supabase.auth.signInAnonymously();
  };

  const value = {
    session,
    user,
    isAnonymous: user?.is_anonymous ?? false,
    member: data?.member ?? null,
    household: data?.household ?? null,
    device: data?.device ?? null,
    profile: data?.profile ?? null,
    loading: authLoading || (!!user && dataLoading),
    signOut,
    signInAsKiosk,
  };

  // Don't render children until auth is loaded to prevent useAuth errors
  if (authLoading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl">Loading HomeHub...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};