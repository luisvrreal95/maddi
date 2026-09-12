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
  signUp: (email: string, password: string, fullName: string, role: 'owner' | 'business', companyName?: string) => Promise<{ error: Error | null }>;
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

  // Replaces the removed on_auth_user_created / on_auth_user_created_role
  // triggers: creates the profile/role rows if they're missing, using the
  // same full_name/role that were passed as signup metadata.
  const ensureProfileAndRole = async (authUser: User) => {
    const fullName = (authUser.user_metadata?.full_name as string) ?? '';
    const role = authUser.user_metadata?.role as UserRole;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ user_id: authUser.id, full_name: fullName });
      if (profileError) console.error('Error creando profile:', profileError.message);
    }

    if (role) {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: authUser.id, role });
        if (roleError) console.error('Error creando user_role:', roleError.message);
      }
    }
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
            if (!hasRole) {
              if (session.user.app_metadata?.provider === 'email') {
                // Email/password signup: profile/role should already exist.
                // Backfill them if they're missing (e.g. removed triggers,
                // or the insert in signUp() failed because there was no
                // session yet at that point).
                await ensureProfileAndRole(session.user);
                await fetchUserRole(session.user.id);
              } else {
                // OAuth user without role: show role selection
                setNeedsRoleSelection(true);
              }
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
        if (!hasRole) {
          if (session.user.app_metadata?.provider === 'email') {
            await ensureProfileAndRole(session.user);
            await fetchUserRole(session.user.id);
          } else {
            setNeedsRoleSelection(true);
          }
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'owner' | 'business', companyName?: string) => {
    // Redirect to home page after email verification
    const redirectUrl = `https://maddi.com.mx/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
          company_name: companyName || null,
        },
      },
    });

    if (error) return { error };

    // Best-effort: this will only succeed if signUp() also returned a
    // session (email confirmation disabled). When confirmation is required
    // there's no session yet and RLS blocks the insert here — in that case
    // ensureProfileAndRole runs again on first sign-in once a session exists.
    if (data.user) {
      await ensureProfileAndRole(data.user);
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
        redirectTo: `https://maddi.com.mx/auth`,
      },
    });
    return { error };
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `https://maddi.com.mx/auth`,
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
    // Clear local state first
    setUserRole(null);
    setNeedsRoleSelection(false);
    setUser(null);
    setSession(null);
    
    try {
      // Clear localStorage manually to ensure session is removed
      localStorage.removeItem('sb-vzkzivropoohapysafya-auth-token');
      
      // Try to sign out from Supabase
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error during sign out:', error);
    }
    
    // Force page reload to clear any cached state
    window.location.replace('/');
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
