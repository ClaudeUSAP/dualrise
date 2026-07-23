import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  role: 'coach' | 'admin' | 'agent';
  status: string;
  school_name?: string | null;
  position?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string, redirectPath?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: 'coach' | 'admin' | 'agent') => boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isCoach: boolean;
  isProfileComplete: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const navigate = useNavigate();

  // Track if logout was user-initiated
  const [userInitiatedLogout, setUserInitiatedLogout] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle token refresh failure - show warning instead of silent logout
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed - session expired');
          toast({
            title: "Session Expirée",
            description: "Votre session a expiré. Veuillez sauvegarder votre travail et vous reconnecter.",
            variant: "destructive",
          });
        }
        
        // Handle unexpected sign out (not user-initiated)
        if (event === 'SIGNED_OUT' && !userInitiatedLogout) {
          console.warn('Unexpected sign out detected');
          toast({
            title: "Déconnexion",
            description: "Vous avez été déconnecté. Veuillez vous reconnecter pour continuer.",
            variant: "destructive",
          });
        }
        
        // Reset the flag after handling
        if (event === 'SIGNED_OUT') {
          setUserInitiatedLogout(false);
        }
        
        // Detect if this is a magic link sign-in
        const isMagicLink = event === 'SIGNED_IN' && 
          (window.location.hash.includes('type=magiclink') || 
           window.location.hash.includes('type=signup') ||
           window.location.hash.includes('access_token'));
        
        // Fetch user profile if authenticated
        if (session?.user) {
          setProfileLoading(true);
          setTimeout(async () => {
            await ensureUserBootstrap(session.user.id, session.user.email || '', isMagicLink);
            await fetchUserProfile(session.user.id);
            setProfileLoading(false);
            setIsLoading(false);
            setIsInitializing(false);
          }, 0);
        } else {
          setUserProfile(null);
          setIsLoading(false);
          setIsInitializing(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setProfileLoading(true);
        await ensureUserBootstrap(session.user.id, session.user.email || '');
        await fetchUserProfile(session.user.id);
        setProfileLoading(false);
        setIsLoading(false);
        setIsInitializing(false);
      } else {
        setIsLoading(false);
        setIsInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureUserBootstrap = async (userId: string, userEmail: string, isMagicLink: boolean = false) => {
    try {
      // Check if user exists in public.users
      const { data: userData } = await supabase
        .from('users')
        .select('id, status')
        .eq('id', userId)
        .maybeSingle();

      const emailName = userEmail.split('@')[0];

      if (!userData) {
        // Create user profile
        // Magic link users get 'active' status for immediate access
        // Regular users get 'pending' status awaiting approval
        const status = isMagicLink ? 'active' : 'pending';

        await supabase.from('users').insert({
          id: userId,
          email: userEmail,
          full_name: emailName,
          first_name: emailName,
          last_name: '',
          status: status,
        });

        console.log(`Created new user with status: ${status} (magic link: ${isMagicLink})`);
      } else if (isMagicLink && userData.status === 'pending') {
        // If existing user is pending but logging in via magic link, activate them
        await supabase.from('users').update({
          status: 'active'
        }).eq('id', userId);

        console.log('Activated pending user via magic link');
      }

      // Check if user has a role in user_roles table (safe check for multiple roles)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1);

      if (!rolesData || rolesData.length === 0) {
        // Create default coach role in user_roles table
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'coach',
        });
      }

      // NOTE: admin "new coach" notification is sent SOLELY by the DB trigger
      // handle_new_user (AFTER INSERT on auth.users), which fires once per real
      // signup across every path (register / OTP / magic-link). We must NOT invoke
      // notify-admins-new-coach from the client here — bootstrap runs on every
      // login, so doing so re-sent the admin email on each sign-in (471 sends for
      // ~130 signups). The trigger is the single source of truth.
    } catch (err) {
      console.error('Error bootstrapping user:', err);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch the user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (userData && !userError) {
        // Fetch ALL roles for the user (handles case of multiple roles)
        const { data: rolesData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        if (!rolesData || rolesData.length === 0) {
          console.error('User has no role in user_roles table');
          return;
        }
        
        // Pick highest priority role: admin > agent > coach
        const pickRole = (roles: Array<{ role: string }>): 'admin' | 'agent' | 'coach' => {
          if (roles.some(r => r.role === 'admin')) return 'admin';
          if (roles.some(r => r.role === 'agent')) return 'agent';
          return 'coach';
        };
        
        const role = pickRole(rolesData);
        
        // Combine the user profile with the role
        const profileWithRole = {
          ...userData,
          role: role
        } as UserProfile;
        
        setUserProfile(profileWithRole);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const login = async (email: string, password: string, redirectPath?: string | null) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Ensure user has profile and role
        await ensureUserBootstrap(data.user.id, data.user.email || '');
        
        // Fetch the user profile and wait for it to complete
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profileData && !profileError) {
          // Fetch ALL roles from user_roles table (handles multiple roles)
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id);
          
          if (!rolesData || rolesData.length === 0) {
            console.error('User has no role in user_roles table');
            return;
          }
          
          // Pick highest priority role: admin > agent > coach
          const pickRole = (roles: Array<{ role: string }>): 'admin' | 'agent' | 'coach' => {
            if (roles.some(r => r.role === 'admin')) return 'admin';
            if (roles.some(r => r.role === 'agent')) return 'agent';
            return 'coach';
          };
          
          const role = pickRole(rolesData);
          
          // Combine profile with role
          const profileWithRole = {
            ...profileData,
            role: role
          } as UserProfile;
          
          // Set the profile in state
          setUserProfile(profileWithRole);
          
          // Check account status
          if (profileWithRole.status === 'pending') {
            toast({
              title: "Account Pending",
              description: "Your account is awaiting approval. You'll be notified via email once approved.",
            });
            navigate('/account-pending');
            return;
          }

          if (profileWithRole.status === 'suspended') {
            toast({
              title: "Account Suspended",
              description: "Your account has been suspended. Please contact support for assistance.",
              variant: "destructive",
            });
            navigate('/account-suspended');
            return;
          }
          
          if (profileWithRole.status === 'rejected') {
            await supabase.auth.signOut();
            toast({
              title: "Account Inactive",
              description: "Your account application was not approved. Please contact support for more information.",
              variant: "destructive",
            });
            return;
          }
          
          toast({
            title: "Welcome back!",
            description: `Logged in successfully`,
          });
          
          // Redirect priority: explicit ?redirect= param → remembered deep-link
          // (e.g. /athletes/{slug} opened while logged out) → role-based default
          const stored = sessionStorage.getItem('postLoginRedirect');
          if (redirectPath) {
            navigate(redirectPath);
          } else if (stored) {
            sessionStorage.removeItem('postLoginRedirect');
            navigate(stored);
          } else {
            // Navigate based on the fetched role
            if (profileWithRole.role === 'admin' || profileWithRole.role === 'agent') {
              navigate('/admin');
            } else {
              navigate('/dashboard');
            }
          }
        } else {
          // If profile fetch fails, still show success but navigate to dashboard
          toast({
            title: "Welcome back!",
            description: `Logged in successfully`,
          });
          
          // Same redirect priority as above (profile fetch failed, no role known)
          const stored = sessionStorage.getItem('postLoginRedirect');
          if (redirectPath) {
            navigate(redirectPath);
          } else if (stored) {
            sessionStorage.removeItem('postLoginRedirect');
            navigate(stored);
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    setUserInitiatedLogout(true); // Mark as user-initiated to avoid duplicate toast
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    toast({
      title: "Déconnecté",
      description: "Vous avez été déconnecté avec succès",
    });
    navigate('/');
  };

  const hasRole = (role: 'coach' | 'admin' | 'agent'): boolean => {
    return userProfile?.role === role;
  };

  const isAdmin = userProfile?.role === 'admin';
  const isAgent = userProfile?.role === 'agent';
  const isCoach = userProfile?.role === 'coach';

  const isProfileComplete = !!(
    userProfile?.first_name?.trim() &&
    userProfile?.last_name?.trim() &&
    userProfile?.full_name?.trim() &&
    userProfile.full_name !== 'New User' &&
    userProfile?.school_name?.trim() &&
    userProfile?.role
  );

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        isLoading: isLoading || profileLoading || isInitializing,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        isAdmin,
        isAgent,
        isCoach,
        isProfileComplete,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};