import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'agent';
  status: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminUserData {
  email: string;
  password?: string; // Optional - will be auto-generated if not provided
  full_name: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'agent';
  phone?: string;
  status?: string;
}

// Utility function to generate secure random password
const generateSecurePassword = (): string => {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export interface UpdateAdminUserData {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  status?: string;
}

// Fetch all admin and agent users
export const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  // Workaround for missing FK relationship between users and user_roles:
  // 1) Fetch roles from user_roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['admin', 'agent']);

  if (rolesError) {
    console.error('Error fetching roles for admin users:', rolesError);
    throw rolesError;
  }

  if (!roles || roles.length === 0) return [];

  const roleMap = new Map<string, 'admin' | 'agent'>();
  for (const r of roles as any[]) {
    roleMap.set(r.user_id, r.role);
  }

  const userIds = Array.from(roleMap.keys());

  // 2) Fetch users by ids
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, first_name, last_name, status, phone, created_at, updated_at')
    .in('id', userIds)
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('Error fetching admin users:', usersError);
    throw usersError;
  }

  return (users || []).map((u: any) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    first_name: u.first_name,
    last_name: u.last_name,
    status: u.status,
    phone: u.phone,
    created_at: u.created_at,
    updated_at: u.updated_at,
    role: roleMap.get(u.id) as 'admin' | 'agent',
  }));
};

// Create new admin user - uses edge function with service role
export const createAdminUser = async (userData: CreateAdminUserData): Promise<{ password: string; emailSent: boolean }> => {
  // Generate password client-side to avoid it being logged in API responses
  const password = userData.password || generateSecurePassword();
  
  const { data, error } = await supabase.functions.invoke('create-admin-user', {
    body: {
      email: userData.email,
      password: password,
      full_name: userData.full_name,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      phone: userData.phone,
      status: userData.status
    }
  });

  if (error) {
    console.error('Error creating admin user:', error);
    // Extract the detailed error message from the edge function response
    const errorMessage = (error as any).context?.error || data?.error || error.message || 'Failed to create admin user';
    throw new Error(errorMessage);
  }

  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed to create admin user');
  }

  // Return password that was generated client-side (never from server response)
  return { 
    password: password,
    emailSent: data.emailSent 
  };
};

// Update admin user
export const updateAdminUser = async (userId: string, userData: UpdateAdminUserData): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update(userData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating admin user:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, newRole: 'admin' | 'agent'): Promise<void> => {
  // First check if role exists
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (existingRole) {
    // Update existing role
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  } else {
    // Insert new role
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole });

    if (error) {
      console.error('Error inserting user role:', error);
      throw error;
    }
  }
};

// Suspend/activate user
export const toggleUserStatus = async (userId: string, currentStatus: string): Promise<void> => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  const { error } = await supabase
    .from('users')
    .update({ status: newStatus })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Delete admin user
export const deleteAdminUser = async (userId: string): Promise<void> => {
  // Delete from user_roles first (foreign key constraint)
  const { error: roleError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (roleError) {
    console.error('Error deleting user role:', roleError);
    throw roleError;
  }

  // Delete from users table
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (userError) {
    console.error('Error deleting user:', userError);
    throw userError;
  }

  // Delete from auth.users (requires admin privileges)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    console.error('Error deleting auth user:', authError);
    // Don't throw here as the user records are already deleted
  }
};

// Set manual password - requires admin privileges (uses edge function with service role)
export const setManualPassword = async (userId: string, newPassword: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('set-user-password', {
    body: {
      userId,
      password: newPassword
    }
  });

  if (error) {
    console.error('Error setting manual password:', error);
    throw new Error(error.message || 'Failed to set password');
  }

  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed to set password');
  }
};

// Send password reset email - requires admin privileges (uses edge function)
export const sendPasswordResetEmail = async (userId: string): Promise<{ emailSent: boolean; actionLink?: string }> => {
  // First, fetch the user's email
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user email:', userError);
    throw new Error('Failed to fetch user email');
  }

  const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
    body: {
      userEmail: userData.email,
      frontendUrl: 'https://dualrise.vercel.app',
      mode: 'link',
    },
  });

  if (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(error.message || 'Failed to send password reset email');
  }

  return {
    emailSent: true,
    actionLink: data?.actionLink,
  };
};
