import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'owner' | 'business' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  needsRoleSelection: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'owner' | 'business') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithFacebook: () => Promise<{ error: Error | null }>;
  assignRole: (role: 'owner' | 'business') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  const fetchUserRole = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data?.role) {
      setUserRole(data.role as UserRole);
      setNeedsRoleSelection(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            const hasRole = await fetchUserRole(session.user.id);
            // If OAuth user without role, show role selection
            if (!hasRole && session.user.app_metadata?.provider !== 'email') {
              setNeedsRoleSelection(true);
            }
          }, 0);
        } else {
          setUserRole(null);
          setNeedsRoleSelection(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const hasRole = await fetchUserRole(session.user.id);
        if (!hasRole && session.user.app_metadata?.provider !== 'email') {
          setNeedsRoleSelection(true);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'owner' | 'business') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { error };

    // Insert user role
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });

      if (roleError) {
        return { error: new Error('Error al asignar rol: ' + roleError.message) };
      }

      // Update profile with full name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', data.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const assignRole = async (role: 'owner' | 'business') => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: user.id, role });

    if (error) {
      return { error: new Error('Error al asignar rol: ' + error.message) };
    }

    setUserRole(role);
    setNeedsRoleSelection(false);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setNeedsRoleSelection(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole, 
      isLoading, 
      needsRoleSelection,
      signUp, 
      signIn, 
      signInWithGoogle,
      signInWithFacebook,
      assignRole,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
