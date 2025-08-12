import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface Household {
  id: string;
  name: string;
  is_setup_complete: boolean;
  chore_reset_day: number;
  chore_reset_frequency: string;
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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser: User) => {
    if (currentUser.is_anonymous) {
        const { data: deviceData, error } = await supabase.from('devices').select('*').eq('kiosk_user_id', currentUser.id).single();
        if (deviceData) {
            setDevice(deviceData);
            const { data: householdData } = await supabase.from('households').select('*').eq('id', deviceData.household_id).single();
            setHousehold(householdData);
        }
        if(error) setDevice(null); // Not paired yet
    } else {
        // Step 1: Fetch the user's member record
        const { data: memberData } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (memberData) {
            setMember(memberData);
            // Step 2: Use the member record to fetch the household
            const { data: householdData } = await supabase
                .from('households')
                .select('*')
                .eq('id', memberData.household_id)
                .single();
            setHousehold(householdData || null);
        }
        
        // Step 3: Fetch the user's public profile
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        setProfile(profileData || null);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAnonymous(currentUser?.is_anonymous ?? false);
      if (currentUser) {
        await fetchUserData(currentUser);
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsAnonymous(currentUser?.is_anonymous ?? false);
        
        // Reset state
        setMember(null);
        setHousehold(null);
        setDevice(null);
        setProfile(null);

        if (currentUser) {
          await fetchUserData(currentUser);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInAsKiosk = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
        showError("Could not start Kiosk mode.");
        console.error(error);
    }
    setLoading(false);
  }

  const value = { session, user, isAnonymous, member, household, device, profile, loading, signOut, signInAsKiosk };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};