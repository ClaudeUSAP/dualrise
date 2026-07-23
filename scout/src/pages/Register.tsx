import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, ArrowLeft, Upload, Check, X, Info, Eye, EyeOff, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { registerSchema, RegisterFormValues } from "@/lib/validation/registerForm";
import { UniversityCombobox } from "@/components/UniversityCombobox";

const RATE_LIMIT_STORAGE_KEY = 'registration_rate_limit_end';
const RATE_LIMIT_DURATION_SECONDS = 60;

const Register = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rateLimitEndTime, setRateLimitEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      profilePhoto: null,
      universityId: null,
      isNewUniversity: false,
      newUniversityName: "",
      newUniversityDivision: undefined,
      newUniversityState: "",
      position: "",
      experience: "",
      programs: {
        mens: false,
        womens: false,
      },
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      privacyAccepted: false,
      recruitingNeeds: "",
      referralSource: "",
    },
  });

  const password = form.watch("password");
  const email = form.watch("email");

  // Check for existing rate limit on mount
  useEffect(() => {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored) {
      const endTime = parseInt(stored, 10);
      if (endTime > Date.now()) {
        setRateLimitEndTime(endTime);
      } else {
        localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      }
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!rateLimitEndTime) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((rateLimitEndTime - now) / 1000));
      setRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        setRateLimitEndTime(null);
        localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rateLimitEndTime]);

  // Function to trigger rate limit
  const triggerRateLimit = () => {
    const endTime = Date.now() + (RATE_LIMIT_DURATION_SECONDS * 1000);
    setRateLimitEndTime(endTime);
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, endTime.toString());
  };

  const isRateLimited = remainingSeconds > 0;

  // Password validation helpers
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUpperAndLower: !!password.match(/[a-z]/) && !!password.match(/[A-Z]/),
    hasNumber: !!password.match(/[0-9]/),
    hasSpecialChar: !!password.match(/[^a-zA-Z0-9]/),
  };

  const allPasswordRequirementsMet = 
    passwordRequirements.minLength && 
    passwordRequirements.hasUpperAndLower && 
    passwordRequirements.hasNumber;

  // Password strength calculator
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength++;
    if (pwd.match(/[0-9]/)) strength++;
    if (pwd.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const rawPasswordStrength = calculatePasswordStrength(password);
  const passwordStrength = Math.min(Math.max(rawPasswordStrength, 0), 4);
  const passwordStrengthText = ["Weak", "Fair", "Good", "Strong", "Very Strong"][passwordStrength];
  const passwordStrengthColor = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-600"][passwordStrength];

  // Email validation
  const isInstitutionalEmail = (emailStr: string) => {
    return emailStr.endsWith(".edu") || emailStr.endsWith(".ac.uk") || emailStr.endsWith(".edu.au");
  };

  const onSubmit = async (data: RegisterFormValues) => {
    console.log('🚀 Registration form submitted');
    console.log('📧 Email:', data.email);
    console.log('👤 Name:', data.firstName, data.lastName);
    console.log('🏫 University ID:', data.universityId);
    console.log('📌 Is New University:', data.isNewUniversity);
    
    setIsLoading(true);
    
    try {
      // Check if email is already registered (as coach, admin, or agent)
      const emailToCheck = data.email.toLowerCase().trim();
      console.log('🔍 Checking if email already exists:', emailToCheck);
      
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, status')
        .eq('email', emailToCheck)
        .maybeSingle();

      if (checkError) {
        console.warn('⚠️ Email check failed (will continue with signup):', checkError);
      } else if (existingUser) {
        console.log('❌ Email already exists in system:', emailToCheck, 'status:', existingUser.status);
        
        let statusMessage = "This email is already associated with an account. Please log in or use a different email address.";
        
        if (existingUser.status === 'rejected') {
          statusMessage = "Your previous registration application was not approved. If you believe this is an error, please contact nicplancha@gmail.com.";
        } else if (existingUser.status === 'pending') {
          statusMessage = "Your registration is still pending review. Please check your email for updates or contact support if you haven't heard back.";
        } else if (existingUser.status === 'active') {
          statusMessage = "This email is already registered with an active account. Please log in to access your account.";
        } else if (existingUser.status === 'suspended') {
          statusMessage = "This account has been suspended. Please contact nicplancha@gmail.com for assistance.";
        }
        
        toast({
          title: existingUser.status === 'rejected' ? "Previous Application Not Approved" : "Email Already Registered",
          description: statusMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Email check passed - no existing account found');
      console.log('📤 Calling supabase.auth.signUp...');
      
      // Prepare user metadata based on whether it's a new university or existing
      const userMetadata = data.isNewUniversity ? {
        full_name: `${data.firstName} ${data.lastName}`,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'coach',
        new_university_name: data.newUniversityName,
        new_university_division: data.newUniversityDivision,
        new_university_state: data.newUniversityState || null,
        position: data.position,
        phone: `+1${data.phone}`,
        recruiting_needs: data.recruitingNeeds,
      } : {
        full_name: `${data.firstName} ${data.lastName}`,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'coach',
        university_id: data.universityId,
        position: data.position,
        phone: `+1${data.phone}`,
        recruiting_needs: data.recruitingNeeds,
      };

      // Create auth user with metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: userMetadata,
          emailRedirectTo: `${window.location.origin}/account-pending`,
        }
      });

      console.log('📨 Supabase signUp response:', {
        user: authData?.user ? {
          id: authData.user.id,
          email: authData.user.email,
          created_at: authData.user.created_at,
        } : null,
        session: authData?.session ? 'Session exists' : 'No session',
        error: signUpError,
      });

      if (signUpError) {
        console.error('❌ Supabase signUp error:', signUpError);
        throw signUpError;
      }

      if (!authData?.user) {
        console.error('❌ No user returned from Supabase');
        throw new Error('User creation failed - no user object returned');
      }

      if (!authData.user.id) {
        console.error('❌ User created but missing ID');
        throw new Error('User creation incomplete - missing user ID');
      }

      // Check if this is an existing user
      const userCreatedAt = new Date(authData.user.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - userCreatedAt.getTime();
      
      if (timeDiff > 60000) {
        console.log('⚠️ User already existed (created at:', authData.user.created_at, ')');
        toast({
          title: "Email Already Registered",
          description: "This email is already registered. A new confirmation email has been sent to your inbox. Please check your email or log in if you've already confirmed.",
        });
        navigate("/login");
        setIsLoading(false);
        return;
      }

      console.log('✅ User created successfully:', authData.user.id);

      toast({
        title: "Application Submitted Successfully!",
        description: "Check your email to verify your account. You'll be notified once approved.",
      });
      
      navigate("/registration-success");

      // Admin notification is now fired server-side by the on_auth_user_created
      // trigger (handle_new_user → notify-admins-new-coach). The client no longer
      // invokes it here: at signup there is no session yet, and the trigger also
      // creates public.users so the coach shows up in Coach Management immediately.

      // Send registration confirmation email to coach (fire-and-forget). The edge
      // function resolves university_id → universities.name for the real school.
      console.log('📧 Sending registration confirmation email (background)...');
      supabase.functions.invoke('send-coach-registration-confirmation', {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          university: data.isNewUniversity ? data.newUniversityName : undefined,
          universityId: data.isNewUniversity ? undefined : data.universityId,
          email: data.email
        }
      }).then(result => {
        if (result.error) {
          console.error('⚠️ Registration confirmation email error (background):', result.error);
        } else {
          console.log('✅ Registration confirmation email sent (background)');
        }
      }).catch(err => {
        console.error('⚠️ Registration confirmation email exception (background):', err);
      });

      console.log('✅ Registration complete!');
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      let errorMessage = error.message || "An error occurred during registration. Please try again.";
      
      const errorLower = error.message?.toLowerCase() || '';
      
      if (errorLower.includes('rate limit') || errorLower.includes('too many') || errorLower.includes('over_email_send_rate_limit')) {
        triggerRateLimit();
        errorMessage = "Too many registration attempts. Please wait for the timer to complete before trying again.";
      } else if (errorLower.includes('already registered') || errorLower.includes('user already registered')) {
        errorMessage = "This email is already registered. Please log in or check your inbox for a confirmation email.";
      } else if (errorLower.includes('email_not_confirmed') || errorLower.includes('email not confirmed')) {
        errorMessage = "Your email is not yet confirmed. Please check your inbox (and spam folder) for the confirmation email.";
      } else if (errorLower.includes('invalid email') || errorLower.includes('invalid_email')) {
        errorMessage = "Please provide a valid email address.";
      } else if (errorLower.includes('password') || errorLower.includes('weak_password')) {
        errorMessage = "Password does not meet security requirements. Please choose a stronger password.";
      } else if (errorLower.includes('signup_disabled')) {
        errorMessage = "Registration is temporarily disabled. Please try again later or contact support.";
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 Registration process ended');
    }
  };

  const onInvalid = () => {
    const errors = form.formState.errors;
    const errorMessages = Object.values(errors)
      .map(error => {
        if (error && typeof error === 'object' && 'message' in error) {
          return error.message;
        }
        return null;
      })
      .filter(Boolean);
    
    if (errorMessages.length > 0) {
      toast({
        title: "Validation Error",
        description: errorMessages[0] as string,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      setProfilePhoto(file);
      form.setValue("profilePhoto", file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-6">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
        </div>

        <Card className="p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Coach Registration</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Complete your application to access elite French & international tennis talent
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <Info className="h-3 w-3 inline mr-1" />
                All applications are reviewed within 24-48 hours by Dual Rise
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b pb-2">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} aria-invalid={!!form.formState.errors.firstName} />
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
                        <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} aria-invalid={!!form.formState.errors.lastName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email Address <span className="text-destructive">*</span>
                        {!isInstitutionalEmail(email) && email && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Institutional email preferred)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="coach@university.edu"
                          aria-invalid={!!form.formState.errors.email}
                        />
                      </FormControl>
                      <FormMessage />
                      {isInstitutionalEmail(email) && email && (
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          Institutional email detected
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number <span className="text-destructive">*</span></FormLabel>
                      <div className="flex gap-2">
                        <div className="w-20 flex items-center justify-center bg-muted rounded-md border px-3 text-sm font-medium">
                          🇺🇸 +1
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="2345678900"
                            className="flex-1"
                            aria-invalid={!!form.formState.errors.phone}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        US-based coaches only. Enter 10-digit phone number.
                      </p>
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel htmlFor="photo">Profile Photo (Optional)</FormLabel>
                  <div className="mt-1">
                    <label htmlFor="photo" className="cursor-pointer">
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
                        {profilePhoto ? (
                          <div className="flex items-center justify-center space-x-2">
                            <Check className="h-5 w-5 text-green-500" />
                            <span className="text-sm text-muted-foreground">
                              {profilePhoto.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">
                              Click to upload photo (Max 5MB)
                            </span>
                          </div>
                        )}
                      </div>
                      <input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b pb-2">Professional Information</h2>
                
                <FormItem>
                  <FormLabel>University/College <span className="text-destructive">*</span></FormLabel>
                  <UniversityCombobox
                    value={form.watch('universityId') ?? null}
                    onValueChange={(id) => {
                      form.setValue('universityId', id, { shouldValidate: true });
                      if (id) {
                        form.setValue('isNewUniversity', false);
                      }
                    }}
                    onNewUniversity={(isNew) => {
                      form.setValue('isNewUniversity', isNew);
                      if (isNew) {
                        form.setValue('universityId', null);
                      }
                    }}
                    isNewUniversity={form.watch('isNewUniversity') ?? false}
                    newUniversityName={form.watch('newUniversityName') ?? ''}
                    onNewUniversityNameChange={(name) => form.setValue('newUniversityName', name, { shouldValidate: true })}
                    newUniversityDivision={form.watch('newUniversityDivision') ?? ''}
                    onNewUniversityDivisionChange={(div) => form.setValue('newUniversityDivision', div as any, { shouldValidate: true })}
                    newUniversityState={form.watch('newUniversityState') ?? ''}
                    onNewUniversityStateChange={(state) => form.setValue('newUniversityState', state)}
                    disabled={isLoading}
                    error={!!form.formState.errors.universityId}
                  />
                  {form.formState.errors.universityId && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.universityId.message}
                    </p>
                  )}
                </FormItem>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position/Title <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger aria-invalid={!!form.formState.errors.position}>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="head-coach">Head Coach</SelectItem>
                            <SelectItem value="assistant-coach">Assistant Coach</SelectItem>
                            <SelectItem value="recruiting-coordinator">Recruiting Coordinator</SelectItem>
                            <SelectItem value="director">Director of Tennis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Coaching Experience</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0-2">0-2 years</SelectItem>
                            <SelectItem value="3-5">3-5 years</SelectItem>
                            <SelectItem value="6-10">6-10 years</SelectItem>
                            <SelectItem value="11-15">11-15 years</SelectItem>
                            <SelectItem value="15+">15+ years</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="programs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program(s) <span className="text-destructive">*</span></FormLabel>
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mens"
                              checked={field.value?.mens}
                              onCheckedChange={(checked) => 
                                field.onChange({ ...field.value, mens: checked as boolean })
                              }
                            />
                            <label htmlFor="mens" className="text-sm cursor-pointer">Men's Program</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="womens"
                              checked={field.value?.womens}
                              onCheckedChange={(checked) => 
                                field.onChange({ ...field.value, womens: checked as boolean })
                              }
                            />
                            <label htmlFor="womens" className="text-sm cursor-pointer">Women's Program</label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Account Security Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b pb-2">Account Security</h2>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            className="pr-10"
                            aria-invalid={!!form.formState.errors.password}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      {password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${passwordStrengthColor}`}
                                style={{ width: `${(passwordStrength / 4) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{passwordStrengthText}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p className={password.length >= 8 ? "text-green-600" : ""}>
                              {password.length >= 8 ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
                              At least 8 characters
                            </p>
                            <p className={password.match(/[a-z]/) && password.match(/[A-Z]/) ? "text-green-600" : ""}>
                              {password.match(/[a-z]/) && password.match(/[A-Z]/) ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
                              Mix of uppercase and lowercase
                            </p>
                            <p className={password.match(/[0-9]/) ? "text-green-600" : ""}>
                              {password.match(/[0-9]/) ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
                              At least one number
                            </p>
                            <p className={password.match(/[^a-zA-Z0-9]/) ? "text-green-600" : ""}>
                              {password.match(/[^a-zA-Z0-9]/) ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
                              At least one special character
                            </p>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            className="pr-10"
                            aria-invalid={!!form.formState.errors.confirmPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer font-normal">
                            I accept the{" "}
                            <Link to="/terms-of-service" target="_blank" className="text-primary hover:underline">
                              Terms of Service
                            </Link>
                            {" "}<span className="text-destructive">*</span>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="privacyAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer font-normal">
                            I accept the{" "}
                            <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline">
                              Privacy Policy
                            </Link>
                            {" "}<span className="text-destructive">*</span>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Verification Information Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b pb-2">Verification Information</h2>
                
                <FormField
                  control={form.control}
                  name="recruitingNeeds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brief Description of Recruiting Needs (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., Looking for strong academic students with low handicaps..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about SCOUT?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="search">Google/Search Engine</SelectItem>
                          <SelectItem value="colleague">Colleague Referral</SelectItem>
                          <SelectItem value="usap">Dual Rise</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="conference">Conference/Event</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="space-y-4 pt-6 border-t">
                {/* Rate Limit Countdown */}
                {isRateLimited && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-800">Please wait before trying again</span>
                    </div>
                    <p className="text-sm text-amber-700 mb-3">
                      To protect against abuse, please wait for the timer to complete before submitting your application.
                    </p>
                    <div className="space-y-2">
                      <Progress 
                        value={((RATE_LIMIT_DURATION_SECONDS - remainingSeconds) / RATE_LIMIT_DURATION_SECONDS) * 100} 
                        className="h-2 bg-amber-100"
                      />
                      <p className="text-center text-sm font-medium text-amber-800">
                        {remainingSeconds} second{remainingSeconds !== 1 ? 's' : ''} remaining
                      </p>
                    </div>
                  </div>
                )}

                {/* Proactive guidance about email confirmation */}
                {!isRateLimited && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 flex items-start gap-2">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Important:</strong> After submitting, you'll receive a confirmation email. 
                        Please check your spam folder and wait at least 2 minutes before trying again. 
                        Multiple rapid attempts may temporarily block your registration.
                      </span>
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-white hover:opacity-90"
                  disabled={isLoading || isRateLimited}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Creating your account... Please wait
                    </span>
                  ) : isRateLimited ? (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Wait {remainingSeconds}s to submit
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                      Log in
                    </Link>
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">
                    <Info className="h-3 w-3 inline mr-1" />
                    All applications require approval from Dual Rise.
                    You will receive a confirmation email within 24-48 hours.
                  </p>
                </div>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
