import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, HelpCircle, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { loginSchema, type LoginFormValues } from "@/lib/validation/loginForm";
import { setRememberMe } from "@/lib/authStorage";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || null;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Load remembered email and preference on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    const rememberMePreference = localStorage.getItem("auth_remember_me") === 'true';
    
    if (rememberedEmail) {
      form.setValue("email", rememberedEmail);
      form.setValue("rememberMe", true);
    } else {
      // Set checkbox based on stored preference (if any)
      form.setValue("rememberMe", rememberMePreference);
    }
  }, [form]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Set storage preference BEFORE login so session goes to correct storage
      setRememberMe(data.rememberMe ?? false);
      
      await login(data.email, data.password, redirectPath);
      setLoginAttempts(0);
      
      // Save email for next visit if remember me is checked
      if (data.rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
    } catch (error) {
      setLoginAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    const errorMessages = Object.entries(errors)
      .map(([field, error]: [string, any]) => `${field === 'email' ? 'Email' : 'Password'}: ${error.message}`)
      .join(". ");
    
    toast({
      title: "Validation Error",
      description: errorMessages,
      variant: "destructive",
    });
  };

  // Password Reset View

  // Main Login View
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background to-muted/20">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header with back to homepage */}
        <div className="p-4 sm:p-6">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Homepage
          </Link>
        </div>
        
        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8 sm:pb-12">
          <Card className="w-full max-w-md p-6 sm:p-8">
            {/* Logo and Branding */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">SCOUT</h1>
              <p className="text-xs text-muted-foreground">by Dual Rise</p>
              <p className="text-sm text-muted-foreground mt-2">
                Log in to access your recruitment dashboard
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                {/* Multiple Failed Attempts Alert */}
                {loginAttempts >= 2 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Having trouble logging in? Try{" "}
                      <Link to="/password-reset" className="underline font-medium">
                        resetting your password
                      </Link>
                      {" "}or contact support if you need assistance.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="coach@university.edu"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field with Show/Hide */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="pr-10"
                            {...field}
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
                    </FormItem>
                  )}
                />

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                          Remember me
                        </label>
                      </div>
                    )}
                  />
                  <Link
                    to="/password-reset"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-white hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>

                {/* Register Link */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    New to SCOUT?{" "}
                    <Link to="/register" className="text-primary hover:underline font-medium">
                      Register here
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: New accounts require approval from Dual Rise
                  </p>
                </div>
              </form>
            </Form>

            {/* Security Features */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Lock className="h-3 w-3" />
                  <span>SSL Secured</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Privacy Protected</span>
                </div>
              </div>
            </div>


            {/* Support Contact */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                <HelpCircle className="h-3 w-3 inline mr-1" />
                Need help? Contact Nico Paviet:
              </p>
              <div className="flex items-center justify-center gap-3 text-xs">
                <a 
                  href="mailto:nicplancha@gmail.com" 
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </a>
                <span className="text-muted-foreground">|</span>
                <a 
                  href="https://wa.me/18722790009" 
                  className="text-primary hover:underline"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Right side - Professional Background */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, #0B1D58 0%, #132F88 55%, #0B1D58 100%)',
          }}
        />
        
        {/* Content Overlay */}
        <div className="relative z-10 flex items-center justify-center p-12 bg-gradient-to-br from-primary/90 to-primary-dark/90">
          <div className="max-w-lg text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Welcome to SCOUT</h2>
            <p className="text-lg mb-8 text-white/90">
              Your exclusive portal to discover exceptional French & international tennis talent for your college program
            </p>
            
            {/* Key Features */}
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Access Exclusive Profiles</h3>
                  <p className="text-white/80 text-sm">Browse pre-vetted athletes with complete academic and athletic data</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Advanced Search & Filter</h3>
                  <p className="text-white/80 text-sm">Find the perfect fit with comprehensive academic and athletic criteria</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Connect Directly</h3>
                  <p className="text-white/80 text-sm">Request contact information through Dual Rise</p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-sm text-white/60 mb-2">Trusted by</p>
              <p className="text-lg font-semibold">US college coaches</p>
              <p className="text-sm text-white/80">Nationwide</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;