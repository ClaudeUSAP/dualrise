import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { updateAdminUser } from '@/lib/api/adminUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { 
  ArrowLeft, 
  Save, 
  UserPlus, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Loader2,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { coachFormSchema, secureFormStorage, type CoachFormData } from '@/lib/validation/coachForm';

interface UniversityOption {
  id: string;
  name: string;
  division: string | null;
  state: string | null;
}

const AddNewCoach = () => {
  const navigate = useNavigate();
  const { coachId } = useParams();
  const isEditMode = Boolean(coachId);

  // Create edit schema that makes password optional
  const editSchema = coachFormSchema.partial({ password: true, confirmPassword: true });
  
  const form = useForm<CoachFormData>({
    resolver: zodResolver(isEditMode ? editSchema : coachFormSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      university: '',
      division: '',
      position: '',
      yearsExperience: '',
      specialties: [],
      password: '',
      confirmPassword: '',
      status: 'active',
      sendCredentials: true,
      sendWelcome: true,
      notes: '',
      tags: '',
      priority: 'medium',
    },
  });
  
  const [createAnother, setCreateAnother] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [universityOpen, setUniversityOpen] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [isLoadingCoachData, setIsLoadingCoachData] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');

  // Watch form values for dynamic behavior
  const watchedEmail = form.watch('email');
  const watchedPassword = form.watch('password');

  // Universities for the searchable combobox — read from public.universities
  // (verified rows) via the list_universities RPC, same source the rest of the
  // app uses. RLS is on the table, so the SECURITY DEFINER RPC is the path in.
  const { data: universityList = [] } = useQuery({
    queryKey: ['universities-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_universities');
      if (error) throw error;
      return (data ?? []) as UniversityOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredUniversities = useMemo(() => {
    if (!universitySearch) return universityList;
    const q = universitySearch.toLowerCase();
    return universityList.filter((u) => u.name.toLowerCase().includes(q));
  }, [universityList, universitySearch]);

  // Calculate password strength
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[!@#$%^&*]/.test(password)) strength += 12.5;
    return Math.min(100, strength);
  };

  const passwordStrength = calculatePasswordStrength(watchedPassword || '');
  const passwordStrengthText = 
    passwordStrength < 25 ? 'Weak' :
    passwordStrength < 50 ? 'Fair' :
    passwordStrength < 75 ? 'Good' : 'Strong';
  
  const passwordStrengthColor = 
    passwordStrength < 25 ? 'bg-red-500' :
    passwordStrength < 50 ? 'bg-orange-500' :
    passwordStrength < 75 ? 'bg-yellow-500' : 'bg-green-500';

  // Fetch coach data if in edit mode
  useEffect(() => {
    const fetchCoachData = async () => {
      if (!coachId) return;
      
      setIsLoadingCoachData(true);
      try {
        const { data: coach, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', coachId)
          .single();

        if (error) throw error;

        if (coach) {
          setOriginalEmail(coach.email);
          form.reset({
            firstName: coach.first_name || '',
            lastName: coach.last_name || '',
            email: coach.email || '',
            phone: coach.phone || '',
            university: coach.school_name || '',
            division: '',
            position: coach.position || '',
            yearsExperience: '',
            specialties: [],
            password: '',
            confirmPassword: '',
            status: (coach.status as 'active' | 'inactive' | 'pending') || 'active',
            sendCredentials: false,
            sendWelcome: false,
            notes: '',
            tags: '',
            priority: 'medium',
          });
        }
      } catch (error) {
        console.error('Error fetching coach data:', error);
        toast({
          title: "Error",
          description: "Failed to load coach data.",
          variant: "destructive",
        });
        navigate('/admin/coaches');
      } finally {
        setIsLoadingCoachData(false);
      }
    };

    fetchCoachData();
  }, [coachId, navigate]);

  // Auto-save functionality using secure sessionStorage (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      const timer = setTimeout(() => {
        const values = form.getValues();
        if (Object.values(values).some(val => val && val !== '')) {
          secureFormStorage.saveFormDraft(values);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [form.watch(), isEditMode, form]);

  // Load draft on mount from sessionStorage (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      const draft = secureFormStorage.loadFormDraft();
      if (draft) {
        form.reset({ ...form.getValues(), ...draft });
        toast({
          title: "Draft loaded",
          description: "Previous draft has been restored from this session.",
        });
      }
    }
  }, [isEditMode, form]);

  // Check email uniqueness (skip if in edit mode and email hasn't changed)
  useEffect(() => {
    if (!watchedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedEmail)) {
      setEmailExists(false);
      return;
    }

    // Skip check if in edit mode and email hasn't changed
    if (isEditMode && watchedEmail.toLowerCase() === originalEmail.toLowerCase()) {
      setEmailExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('email')
          .eq('email', watchedEmail.toLowerCase())
          .maybeSingle();

        if (error) throw error;
        setEmailExists(!!data);
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedEmail, isEditMode, originalEmail]);

  const generatePassword = () => {
    // Strong, cryptographically-random 16-char password with at least one
    // uppercase, lowercase, digit and symbol — passes the 4 validation criteria
    // and is effectively never present in a breach database (so Supabase's
    // leaked-password protection won't reject it).
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const all = upper + lower + digits + symbols;
    const randInt = (max: number) =>
      crypto.getRandomValues(new Uint32Array(1))[0] % max;
    const pick = (set: string) => set[randInt(set.length)];

    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (chars.length < 16) chars.push(pick(all));
    // Fisher–Yates shuffle so the guaranteed characters aren't in fixed slots.
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const password = chars.join('');

    form.setValue('password', password, { shouldValidate: true });
    form.setValue('confirmPassword', password, { shouldValidate: true });
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(file);
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive"
      });
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const onSubmit = async (data: CoachFormData) => {
    if (emailExists) {
      toast({
        title: "Validation Error",
        description: "This email address is already registered.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && coachId) {
        // Edit mode - update existing coach
        const updateData: any = {
          full_name: `${data.firstName} ${data.lastName}`,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email?.toLowerCase(),
          phone: data.phone,
          school_name: data.university,
          position: data.position,
          status: data.status,
        };

        // Update user in users table
        await updateAdminUser(coachId, updateData);

        // If password is provided, update it
        if (data.password && data.password.length > 0) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            coachId,
            { password: data.password }
          );
          if (passwordError) throw passwordError;
        }

        toast({
          title: "Success!",
          description: "Coach profile has been updated successfully.",
        });

        navigate(`/admin/coaches/${coachId}`);
      } else {
        // Create mode - insert new coach
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email.toLowerCase(),
          password: data.password,
          options: {
            data: {
              full_name: `${data.firstName} ${data.lastName}`,
              first_name: data.firstName,
              last_name: data.lastName,
              role: 'coach',
              school_name: data.university,
              position: data.position,
              phone: data.phone,
            },
          },
        });

        if (authError) throw authError;

        toast({
          title: "Success!",
          description: "Coach account has been created successfully.",
        });

        // Clear the form draft from storage
        secureFormStorage.clearFormDraft();

        // Navigate based on user choice
        if (createAnother) {
          // Reset form
          form.reset();
          setProfilePicture(null);
          setProfilePicturePreview('');
        } else {
          navigate('/admin/coaches');
        }
      }
    } catch (error: any) {
      console.error('Error saving coach:', error);
      // Surface the exact backend error (e.g. Supabase "Password is known to be
      // weak") so the admin knows precisely what to fix.
      toast({
        title: isEditMode ? "Could not update coach" : "Could not create coach",
        description:
          error?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} coach account.`,
        variant: "destructive",
      });
    }
  };

  const onInvalid = (errors: Record<string, { message?: string }>) => {
    // Surface the actual failing field(s) so the admin knows what to fix,
    // instead of a generic "check the form" message that looks like the button
    // "does nothing".
    const messages = Object.values(errors)
      .map((e) => e?.message)
      .filter(Boolean) as string[];
    toast({
      title: "Please fix the form",
      description:
        messages.length > 0
          ? messages.slice(0, 4).join(' · ')
          : "Some fields are invalid. Please review and try again.",
      variant: "destructive",
    });
  };

  const handleSaveAsDraft = () => {
    secureFormStorage.saveFormDraft(form.getValues());
    toast({
      title: "Draft Saved",
      description: "Coach profile saved as draft for this session.",
    });
  };

  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear the form? All unsaved data will be lost.')) {
      form.reset();
      setProfilePicture(null);
      setProfilePicturePreview('');
      secureFormStorage.clearFormDraft();
    }
  };

  if (isLoadingCoachData) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(isEditMode ? `/admin/coaches/${coachId}` : '/admin/coaches')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Coach Management
        </Button>
        {!isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearForm}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Form
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Coach Profile' : 'Add New Coach'}</h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode ? 'Update coach account information' : 'Manually create a new coach account with verified credentials'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic details about the coach</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Picture Upload */}
            <div className="md:col-span-2">
              <Label>Profile Picture</Label>
              <div 
                className={cn(
                  "mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  profilePicturePreview && "border-solid"
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {profilePicturePreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={profilePicturePreview} 
                      alt="Profile preview" 
                      className="w-32 h-32 rounded-full object-cover mx-auto"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0 h-8 w-8"
                      onClick={() => {
                        setProfilePicture(null);
                        setProfilePicturePreview('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag and drop an image here, or click to browse
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="profile-upload"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    <Label htmlFor="profile-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" className="mt-2" asChild>
                        <span>Choose File</span>
                      </Button>
                    </Label>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Smith" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type="email" placeholder="coach@university.edu" className="pr-10" />
                        {checkingEmail && (
                          <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {!checkingEmail && watchedEmail && !emailExists && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedEmail) && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {!checkingEmail && emailExists && (
                          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {emailExists && (
                      <p className="text-sm text-destructive">This email is already registered</p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="+1 (555) 123-4567" />
                    </FormControl>
                    <FormDescription>Format: +1 (XXX) XXX-XXXX</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>University and coaching details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="university"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>University Name *</FormLabel>
                  <Popover open={universityOpen} onOpenChange={setUniversityOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={universityOpen}
                          className={cn(
                            'w-full justify-between font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <span className="truncate">
                            {field.value || 'Search for a university…'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Type to search universities…"
                          value={universitySearch}
                          onValueChange={setUniversitySearch}
                        />
                        <CommandList>
                          <CommandEmpty>No university found.</CommandEmpty>
                          <CommandGroup>
                            {filteredUniversities.slice(0, 100).map((uni) => (
                              <CommandItem
                                key={uni.id}
                                value={uni.name}
                                onSelect={() => {
                                  form.setValue('university', uni.name, {
                                    shouldValidate: true,
                                  });
                                  setUniversityOpen(false);
                                  setUniversitySearch('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === uni.name
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{uni.name}</span>
                                  {uni.division && (
                                    <span className="text-xs text-muted-foreground">
                                      {uni.division}
                                      {uni.state ? ` • ${uni.state}` : ''}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="D1">NCAA Division I</SelectItem>
                      <SelectItem value="D2">NCAA Division II</SelectItem>
                      <SelectItem value="D3">NCAA Division III</SelectItem>
                      <SelectItem value="NAIA">NAIA</SelectItem>
                      <SelectItem value="NJCAA">NJCAA</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coach Title/Position</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Head Coach" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yearsExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="5" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialties"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Coaching Specialties</FormLabel>
                  <FormControl>
                    <div className="flex gap-4 mt-2">
                      {['mens', 'womens', 'both'].map((specialty) => (
                        <div key={specialty} className="flex items-center space-x-2">
                          <Checkbox
                            id={specialty}
                            checked={field.value.includes(specialty)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, specialty]);
                              } else {
                                field.onChange(field.value.filter((s) => s !== specialty));
                              }
                            }}
                          />
                          <Label htmlFor={specialty} className="text-sm font-normal">
                            {specialty === 'mens' ? "Men's Tennis" : specialty === 'womens' ? "Women's Tennis" : "Both"}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Set up login credentials and account status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder={isEditMode ? "Enter new password to change" : "Enter password"}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={generatePassword}
                          >
                            Generate Secure Password
                          </Button>
                        </div>
                        {watchedPassword && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Progress value={passwordStrength} className="flex-1 h-2" />
                              <Badge variant={passwordStrength >= 75 ? "default" : passwordStrength >= 50 ? "secondary" : "destructive"}>
                                {passwordStrengthText}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Password should contain at least 8 characters, uppercase and lowercase letters, numbers, and special characters.
                            </p>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditMode ? 'Confirm New Password' : 'Confirm Password'}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={isEditMode ? "Confirm new password" : "Confirm password"}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="sendCredentials"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Send login credentials to coach via email
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sendWelcome"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Send welcome message
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Notes</CardTitle>
            <CardDescription>Internal notes and categorization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any internal notes about this coach..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="recruiter, experienced, tennis-specialist" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Create Another Checkbox - Only show in create mode */}
        {!isEditMode && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="createAnother"
              checked={createAnother}
              onCheckedChange={(checked) => setCreateAnother(checked as boolean)}
            />
            <Label htmlFor="createAnother" className="text-sm font-normal">
              Create another coach after saving
            </Label>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(isEditMode ? `/admin/coaches/${coachId}` : '/admin/coaches')}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            {!isEditMode && (
              <Button 
                type="button" 
                variant="outline"
                onClick={handleSaveAsDraft}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
            )}
            <Button type="submit">
              <UserPlus className="mr-2 h-4 w-4" />
              {isEditMode ? 'Update Coach' : 'Create Coach Account'}
            </Button>
          </div>
        </div>
        </form>
      </Form>
    </div>
  );
};

export default AddNewCoach;