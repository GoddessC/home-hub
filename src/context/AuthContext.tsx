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
  const queryClient = useQueryClient();

  useEffect(() => {
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

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ['authData', user?.id],
    queryFn: async () => {
      if (!user) return null;

      if (user.is_anonymous) {
        const { data: deviceData, error } = await supabase.from('devices').select('*, household:households(*)').eq('kiosk_user_id', user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        return { device: deviceData, household: deviceData?.household, member: null, profile: null };
      }

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, household:households(*)')
        .eq('user_id', user.id)
        .single();
      
      if (memberError && memberError.code !== 'PGRST116') throw memberError;
      if (!memberData) return null; // Can happen briefly after signup

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      return {
        member: memberData,
        household: memberData.household,
        profile: profileData,
        device: null,
      };
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};