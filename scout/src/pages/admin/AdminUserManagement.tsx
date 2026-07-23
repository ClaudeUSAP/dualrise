import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminUsers, createAdminUser, updateAdminUser, updateUserRole, toggleUserStatus, deleteAdminUser, sendPasswordResetEmail, setManualPassword as setManualPasswordAPI, type AdminUser, type CreateAdminUserData, type UpdateAdminUserData } from '@/lib/api/adminUsers';
import { countryCodes } from '@/data/countryCodes';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Users,
  Shield,
  Activity,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Key,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Mail,
  Phone,
  Calendar,
  History,
  Settings,
  CheckCircle,
  XCircle,
  MoreVertical,
  RefreshCw,
  FileText,
  Database,
  BarChart3,
  Trophy,
  MessageSquare,
  Info,
  AlertTriangle,
  LogIn,
  LogOut,
  Fingerprint,
  Globe,
  Timer,
  Briefcase,
  UserCog,
  ClipboardCheck,
  ShieldCheck as FileShield,
  Copy
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const AdminUserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedTab, setSelectedTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'admins' | 'agents'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [passwordMethod, setPasswordMethod] = useState<'auto' | 'manual'>('auto');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<{
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  
  // Reset password state
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [showResetSuccessDialog, setShowResetSuccessDialog] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetActionLink, setResetActionLink] = useState<string>('');
  const [passwordResetMode, setPasswordResetMode] = useState<'link' | 'manual'>('link');
  const [manualPassword, setManualPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  
  // Duplicate email alert state
  const [showDuplicateEmailAlert, setShowDuplicateEmailAlert] = useState(false);
  const [duplicateEmailUser, setDuplicateEmailUser] = useState<AdminUser | null>(null);
  
  // Form state for adding/editing users
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    first_name: '',
    last_name: '',
    role: 'admin' as 'admin' | 'agent',
    phone: '',
    countryCode: '+1',
    status: 'active'
  });

  // Fetch admin users
  const { data: adminUsers = [], isLoading, error, isError } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: fetchAdminUsers,
    retry: 1, // Only retry once to fail faster
    staleTime: 30000 // Cache for 30 seconds to avoid repeated failed requests
  });

  // Debug logging
  useEffect(() => {
    if (isError) {
      console.error('Admin users query error:', error);
    }
    if (!isLoading && adminUsers) {
      console.log('Admin users loaded:', adminUsers.length, 'users');
    }
  }, [isLoading, isError, error, adminUsers]);

  // Create admin mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAdminUserData) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error: any) => {
      // Close the dialog and reset form on error
      setShowAddDialog(false);
      resetForm();
      
      // Show user-friendly error message
      const errorMessage = error.message || "Failed to create admin user";
      const isEmailExists = errorMessage.includes("already been registered") || 
                           errorMessage.includes("email address has already");
      
      toast({
        title: isEmailExists ? "Email Already Exists" : "Error",
        description: isEmailExists 
          ? "This email address is already registered. Please use a different email or update the existing user."
          : errorMessage,
        variant: "destructive"
      });
    }
  });

  // Update admin mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminUserData }) => 
      updateAdminUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin user",
        variant: "destructive"
      });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'agent' }) => 
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, currentStatus }: { userId: string; currentStatus: string }) => 
      toggleUserStatus(userId, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({
        title: "Status Updated",
        description: "User status has been updated successfully.",
      });
    }
  });

  // Delete admin mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({
        title: "Admin Deleted",
        description: "Administrator account has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin user",
        variant: "destructive"
      });
    }
  });

  // Reset password mutation (send link)
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => sendPasswordResetEmail(userId),
    onSuccess: (data) => {
      setResetEmailSent(true);
      setResetActionLink(data.actionLink || '');
      toast({
        title: "Email Sent",
        description: `Password reset link sent to ${resetPasswordUser?.email}`,
      });
      setShowResetPasswordDialog(false);
      setShowResetSuccessDialog(true);
    },
    onError: (error) => {
      console.error('Reset password error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive"
      });
    }
  });

  // Set manual password mutation
  const setManualPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => 
      setManualPasswordAPI(userId, password),
    onSuccess: () => {
      toast({
        title: "Password Set",
        description: `Password has been set successfully for ${resetPasswordUser?.full_name}`,
      });
      setShowResetPasswordDialog(false);
      setShowResetSuccessDialog(true);
    },
    onError: (error) => {
      console.error('Set manual password error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set password",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      first_name: '',
      last_name: '',
      role: 'admin',
      phone: '',
      countryCode: '+1',
      status: 'active'
    });
    setPasswordMethod('auto');
  };

  // Open edit dialog with selected user data
  const handleEditClick = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    
    // Extract country code from phone
    let countryCode = '+1';
    let phoneNumber = admin.phone || '';
    
    if (phoneNumber) {
      const match = phoneNumber.match(/^(\+\d{1,4})/);
      if (match) {
        countryCode = match[1];
        phoneNumber = phoneNumber.replace(countryCode, '').trim();
      }
    }
    
    setFormData({
      email: admin.email,
      password: '',
      confirmPassword: '',
      full_name: admin.full_name,
      first_name: admin.first_name || '',
      last_name: admin.last_name || '',
      role: admin.role,
      phone: phoneNumber,
      countryCode: countryCode,
      status: admin.status
    });
    setShowEditDialog(true);
  };

  // Filter users
  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    // Status-based filtering
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = user.status === 'active';
    } else if (statusFilter === 'inactive') {
      matchesStatus = user.status !== 'active';
    } else if (statusFilter === 'admins') {
      matchesStatus = user.role === 'admin';
    } else if (statusFilter === 'agents') {
      matchesStatus = user.role === 'agent';
    }
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const totalUsers = adminUsers.length;
  const activeUsers = adminUsers.filter(u => u.status === 'active').length;
  const adminCount = adminUsers.filter(u => u.role === 'admin').length;
  const agentCount = adminUsers.filter(u => u.role === 'agent').length;

  const handleAddAdmin = async () => {
    if (!formData.email || !formData.first_name || !formData.last_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check if email already exists
    const existingUser = adminUsers.find(
      user => user.email.toLowerCase() === formData.email.toLowerCase()
    );

    if (existingUser) {
      setDuplicateEmailUser(existingUser);
      setShowDuplicateEmailAlert(true);
      return;
    }

    // Validate manual password if selected
    if (passwordMethod === 'manual') {
      if (!formData.password || formData.password.length < 8) {
        toast({
          title: "Error",
          description: "Password must be at least 8 characters long",
          variant: "destructive",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const result = await createMutation.mutateAsync({
        email: formData.email,
        password: passwordMethod === 'manual' ? formData.password : undefined,
        full_name: `${formData.first_name} ${formData.last_name}`,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        phone: formData.phone ? `${formData.countryCode}${formData.phone}` : '',
        status: formData.status
      });
      
      // Store the password info to show in dialog
      setCreatedUserInfo({
        email: formData.email,
        password: result.password,
        emailSent: result.emailSent,
      });
      
      setShowAddDialog(false);
      setShowPasswordDialog(true);
      resetForm();
    } catch (error: any) {
      // Error handled by mutation onError
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    // Check if email is being changed and if new email already exists
    if (formData.email && formData.email.toLowerCase() !== selectedAdmin.email.toLowerCase()) {
      const existingUser = adminUsers.find(
        user => user.email.toLowerCase() === formData.email.toLowerCase() && user.id !== selectedAdmin.id
      );

      if (existingUser) {
        setDuplicateEmailUser(existingUser);
        setShowDuplicateEmailAlert(true);
        return;
      }
    }

    try {
      const promises = [];
      
      // Always update user data
      promises.push(
        updateMutation.mutateAsync({
          id: selectedAdmin.id,
          data: {
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone ? `${formData.countryCode}${formData.phone}` : '',
            status: formData.status
          }
        })
      );
      
      // Add role update if changed
      if (formData.role !== selectedAdmin.role) {
        promises.push(
          updateRoleMutation.mutateAsync({
            userId: selectedAdmin.id,
            role: formData.role
          })
        );
      }
      
      // Wait for all mutations to complete
      await Promise.all(promises);
      
      // Invalidate once after everything completes
      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      
      // Close dialog and show success
      setShowEditDialog(false);
      setSelectedAdmin(null);
      toast({
        title: "Admin Updated",
        description: "Administrator account has been updated successfully.",
      });
    } catch (error: any) {
      // Errors already handled by individual mutation onError handlers
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete your own account",
        variant: "destructive"
      });
      return;
    }

    if (confirm('Are you sure you want to delete this admin user?')) {
      deleteMutation.mutate(userId);
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Change Status",
        description: "You cannot change your own status",
        variant: "destructive"
      });
      return;
    }

    toggleStatusMutation.mutate({ userId, currentStatus });
  };

  const handleResetPasswordClick = (admin: AdminUser) => {
    setResetPasswordUser(admin);
    setPasswordResetMode('link');
    setManualPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setGeneratedPassword('');
    setShowResetPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    if (passwordResetMode === 'link') {
      try {
        await resetPasswordMutation.mutateAsync(resetPasswordUser.id);
      } catch (error) {
        // Error handled by mutation
      }
    } else {
      // Manual password mode
      if (manualPassword !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive"
        });
        return;
      }

      if (manualPassword.length < 8) {
        toast({
          title: "Error",
          description: "Password must be at least 8 characters long",
          variant: "destructive"
        });
        return;
      }

      // Validate password strength
      const hasUppercase = /[A-Z]/.test(manualPassword);
      const hasLowercase = /[a-z]/.test(manualPassword);
      const hasNumber = /[0-9]/.test(manualPassword);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(manualPassword);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        toast({
          title: "Error",
          description: "Password must contain uppercase, lowercase, number, and special character",
          variant: "destructive"
        });
        return;
      }

      try {
        setGeneratedPassword(manualPassword);
        await setManualPasswordMutation.mutateAsync({ 
          userId: resetPasswordUser.id, 
          password: manualPassword 
        });
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleGeneratePassword = () => {
    const password = generateSecurePassword();
    setManualPassword(password);
    setConfirmPassword(password);
    setGeneratedPassword(password);
  };

  const generateSecurePassword = (): string => {
    const length = 16;
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed: I, O (visually similar to 1, 0)
    const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Removed: i, l, o (visually similar)
    const numbers = '23456789'; // Removed: 0, 1 (visually similar to O, I, l)
    const symbols = '!@#$%^&*()_+-=.,?'; // Removed: []{}|;:<> (encoding/confusion issues)
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'Inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'Locked':
        return <Badge variant="destructive">Locked</Badge>;
      case 'Pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    return <Badge variant={role === 'admin' ? 'destructive' : 'default'}>{role === 'admin' ? 'Admin' : 'Agent'}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage administrator and agent accounts</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New User</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">Create a new admin or agent account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Password Method</Label>
                <RadioGroup value={passwordMethod} onValueChange={(value: 'auto' | 'manual') => setPasswordMethod(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto" className="font-normal cursor-pointer">
                      Auto-generate & Email Password
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="font-normal cursor-pointer">
                      Set Password Manually
                    </Label>
                  </div>
                </RadioGroup>
                {passwordMethod === 'auto' && (
                  <p className="text-sm text-muted-foreground">
                    A secure password will be generated and displayed after creation. If your email domain is verified, it will also be sent via email.
                  </p>
                )}
                {passwordMethod === 'manual' && (
                  <p className="text-sm text-muted-foreground">
                    You will need to share the password with the user manually.
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Enter first name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Enter last name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-background z-50">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span className="font-mono">{country.code}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      id="phone" 
                      className="flex-1"
                      placeholder="612345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select country code and enter phone number
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'agent') => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="admin">Admin (Full Access)</SelectItem>
                      <SelectItem value="agent">Agent (Athletes & Tournaments Only)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.role === 'admin' 
                      ? 'Full access to all admin features including coaches, settings, and analytics'
                      : 'Limited access to athlete and tournament management only'}
                  </p>
                </div>
              </div>

              {passwordMethod === 'manual' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleAddAdmin}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Success Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">User Created Successfully</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  The user account has been created successfully.
                </AlertDescription>
              </Alert>

              {createdUserInfo && (
                <>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2">
                      <Input value={createdUserInfo.email} readOnly />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserInfo.email);
                          toast({ title: "Email copied to clipboard" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="flex items-center gap-2">
                      <Input value={createdUserInfo.password} readOnly type="text" className="font-mono" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserInfo.password);
                          toast({ title: "Password copied to clipboard" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {createdUserInfo.emailSent ? (
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        ✅ Password has been emailed to the user
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        ⚠️ Email delivery failed - you must share this password manually
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Make sure to save this password - it won't be shown again.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => {
                setShowPasswordDialog(false);
                setCreatedUserInfo(null);
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Total</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{isLoading ? '-' : totalUsers}</p>
              <p className="text-xs text-muted-foreground">All Users</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'active' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{isLoading ? '-' : activeUsers}</p>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'admins' || statusFilter === 'agents' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            if (statusFilter === 'admins') {
              setStatusFilter('agents');
            } else if (statusFilter === 'agents') {
              setStatusFilter('all');
            } else {
              setStatusFilter('admins');
            }
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Security</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{isLoading ? '-' : `${adminCount}/${agentCount}`}</p>
              <p className="text-xs text-muted-foreground">
                {statusFilter === 'admins' ? 'Showing Admins' : statusFilter === 'agents' ? 'Showing Agents' : 'Admins / Agents'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'inactive' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('inactive')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Alerts</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{isLoading ? '-' : totalUsers - activeUsers}</p>
              <p className="text-xs text-muted-foreground">Inactive Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admin users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Admin Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4">Admin User</th>
                      <th className="text-left p-4">Role</th>
                      <th className="text-left p-4">Last Login</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Security</th>
                      <th className="text-left p-4">Created</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading admin users...
                        </td>
                      </tr>
                    ) : isError ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                            <div>
                              <p className="font-medium text-destructive mb-1">Failed to Load Admin Users</p>
                              <p className="text-sm text-muted-foreground">
                                {error?.message || "There was an error loading the admin users. This might be due to permissions or connectivity issues."}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              onClick={() => queryClient.invalidateQueries({ queryKey: ['adminUsers'] })}
                              className="mt-2"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No admin users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(admin => (
                        <tr key={admin.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src="" />
                                <AvatarFallback>{admin.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{admin.full_name}</p>
                                <p className="text-sm text-muted-foreground">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant={admin.role === 'admin' ? 'destructive' : 'default'}>
                              {admin.role === 'admin' ? 'Admin' : 'Agent'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <p className="text-sm">{format(new Date(admin.updated_at), 'PPp')}</p>
                              <p className="text-xs text-muted-foreground">Last activity</p>
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(admin.status)}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              2FA Not Configured
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <p className="text-sm">{format(new Date(admin.created_at), 'PP')}</p>
                              <p className="text-xs text-muted-foreground">System</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditClick(admin)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPasswordClick(admin)}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(admin)}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Manage Permissions
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(admin.id, admin.status)}>
                                  {admin.status === 'active' ? (
                                    <>
                                      <Lock className="mr-2 h-4 w-4" />
                                      Suspend Account
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="mr-2 h-4 w-4" />
                                      Activate Account
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteUser(admin.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Reset Password</DialogTitle>
            <DialogDescription>
              {resetPasswordUser && `Reset password for ${resetPasswordUser.full_name} (${resetPasswordUser.email})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Choose a method:</Label>
              <RadioGroup value={passwordResetMode} onValueChange={(value: 'link' | 'manual') => setPasswordResetMode(value)}>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="link" id="link" />
                  <div className="space-y-1 leading-none flex-1">
                    <Label htmlFor="link" className="font-medium cursor-pointer">
                      Send Reset Link via Email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      User receives email with link to create their own password
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="manual" id="manual" />
                  <div className="space-y-1 leading-none flex-1">
                    <Label htmlFor="manual" className="font-medium cursor-pointer">
                      Set Password Manually
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Set a temporary password that the user can change later
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {passwordResetMode === 'link' ? (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  The user will receive an email with a link to create a new password. The link will expire in 1 hour.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manualPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="manualPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword} className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  Generate Strong Password
                </Button>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <div className="font-medium mb-1">Password Requirements:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li className={manualPassword.length >= 8 ? 'text-success' : ''}>At least 8 characters</li>
                      <li className={/[A-Z]/.test(manualPassword) ? 'text-success' : ''}>One uppercase letter</li>
                      <li className={/[a-z]/.test(manualPassword) ? 'text-success' : ''}>One lowercase letter</li>
                      <li className={/[0-9]/.test(manualPassword) ? 'text-success' : ''}>One number</li>
                      <li className={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(manualPassword) ? 'text-success' : ''}>One special character</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={
                passwordResetMode === 'link' 
                  ? resetPasswordMutation.isPending 
                  : setManualPasswordMutation.isPending || !manualPassword || !confirmPassword
              }
            >
              {passwordResetMode === 'link' 
                ? (resetPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link')
                : (setManualPasswordMutation.isPending ? 'Setting...' : 'Set Password')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Success Dialog */}
      <Dialog open={showResetSuccessDialog} onOpenChange={setShowResetSuccessDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {passwordResetMode === 'manual' ? 'Password Set Successfully' : 'Password Reset Email Sent'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {passwordResetMode === 'manual' 
                  ? 'Password has been set successfully.' 
                  : 'Password reset link has been sent successfully.'
                }
              </AlertDescription>
            </Alert>

            {resetPasswordUser && (
              <div className="space-y-2">
                <Label>{passwordResetMode === 'manual' ? 'User' : 'Sent to'}</Label>
                <Input value={`${resetPasswordUser.full_name} (${resetPasswordUser.email})`} readOnly />
              </div>
            )}

            {passwordResetMode === 'manual' && generatedPassword && (
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedPassword} readOnly type="text" className="font-mono text-sm" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      toast({
                        title: "Copied",
                        description: "Password copied to clipboard"
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Alert variant="default" className="bg-warning/10 border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-xs">
                    This password will only be shown once. Make sure to copy it and share it securely with the user.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {passwordResetMode === 'link' && resetActionLink && (
              <div className="space-y-2">
                <Label>Reset Link (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input value={resetActionLink} readOnly type="text" className="font-mono text-xs" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(resetActionLink);
                      toast({
                        title: "Copied",
                        description: "Reset link copied to clipboard"
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can share this link with the user if they didn't receive the email.
                </p>
              </div>
            )}

            <Alert variant="default">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {passwordResetMode === 'manual'
                  ? 'The user should change this temporary password after their first login.'
                  : 'The user will be able to set their own password when they click the link in their email.'
                }
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowResetSuccessDialog(false);
              setResetPasswordUser(null);
              setResetActionLink('');
              setGeneratedPassword('');
              setManualPassword('');
              setConfirmPassword('');
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Administrator</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">Update admin account details and permissions</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input 
                    id="editFirstName" 
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input 
                    id="editLastName" 
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input 
                    id="editEmail" 
                    type="email" 
                    value={formData.email}
                    disabled
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-background z-50">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span className="font-mono">{country.code}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      id="editPhone" 
                      className="flex-1"
                      placeholder="612345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select country code and enter phone number
                  </p>
                </div>
                
                <Alert className="col-span-2 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Admin:</strong> Full system access including user management and role assignments • <strong>Agent:</strong> Can manage athletes, tournaments, and data but cannot manage users or assign roles
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select 
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'agent') => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Security Actions Section */}
                <div className="col-span-2 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Security</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Manage password and authentication settings
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowEditDialog(false);
                        handleResetPasswordClick(selectedAdmin);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Key className="h-4 w-4" />
                      Reset Password
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updateMutation.isPending || updateRoleMutation.isPending}>Cancel</Button>
            <Button onClick={handleEditAdmin} disabled={updateMutation.isPending || updateRoleMutation.isPending}>
              {(updateMutation.isPending || updateRoleMutation.isPending) && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Email Alert Dialog */}
      <AlertDialog open={showDuplicateEmailAlert} onOpenChange={setShowDuplicateEmailAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Email Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base">
                This email address is already registered in the system.
              </p>
              {duplicateEmailUser && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Existing User:</span>
                    {getRoleBadge(duplicateEmailUser.role)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {duplicateEmailUser.full_name}</p>
                    <p><span className="font-medium">Email:</span> {duplicateEmailUser.email}</p>
                    <p><span className="font-medium">Status:</span> {duplicateEmailUser.status}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Please use a different email address or update the existing user's information instead.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDuplicateEmailAlert(false);
              setDuplicateEmailUser(null);
            }}>
              Close
            </AlertDialogCancel>
            {duplicateEmailUser && (
              <AlertDialogAction onClick={() => {
                setShowDuplicateEmailAlert(false);
                setShowAddDialog(false);
                setSelectedAdmin(duplicateEmailUser);
                setFormData({
                  email: duplicateEmailUser.email,
                  password: '',
                  confirmPassword: '',
                  full_name: duplicateEmailUser.full_name,
                  first_name: duplicateEmailUser.first_name || '',
                  last_name: duplicateEmailUser.last_name || '',
                  role: duplicateEmailUser.role,
                  phone: duplicateEmailUser.phone?.replace(/^\+\d+/, '') || '',
                  countryCode: duplicateEmailUser.phone?.match(/^\+\d+/)?.[0] || '+33',
                  status: duplicateEmailUser.status
                });
                setShowEditDialog(true);
                setDuplicateEmailUser(null);
              }}>
                Edit Existing User
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;