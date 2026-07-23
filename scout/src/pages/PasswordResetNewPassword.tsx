import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Shield, Eye, EyeOff, Check, X, Info, Lock, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { passwordResetNewSchema, PasswordResetNewFormValues } from "@/lib/validation/passwordResetNewForm";

const PasswordResetNewPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);

  // Token from new scanner-proof flow
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  // Whether we have a valid session from the old flow
  const [hasSession, setHasSession] = useState(false);

  const form = useForm<PasswordResetNewFormValues>({
    resolver: zodResolver(passwordResetNewSchema),
    mode: "onTouched",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");

  useEffect(() => {
    const initialize = async () => {
      // 1. Check for token_hash in search params (new scanner-proof flow)
      const hashParam = searchParams.get("token_hash");
      const typeParam = searchParams.get("type");

      if (hashParam && typeParam === "recovery") {
        setTokenHash(hashParam);
        setIsLoading(false);
        return;
      }

      // 2. Backward compat: check for existing session (old ConfirmationURL flow)
      // Give Supabase time to process the recovery token from URL hash
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setHasSession(true);
        setIsLoading(false);
        return;
      }

      // 3. Neither flow detected — show error state
      setTokenExpired(true);
      setIsLoading(false);
    };

    initialize();
  }, [searchParams]);

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

  const onSubmit = async (data: PasswordResetNewFormValues) => {
    setIsSubmitting(true);
    
    try {
      // New flow: verify the token_hash first to establish a session
      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (verifyError) {
          console.error("verifyOtp failed:", verifyError);
          setTokenExpired(true);
          setIsSubmitting(false);
          return;
        }
      }
      // Old flow: session already exists from the ConfirmationURL redirect

      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) throw error;

      // Sign out immediately to prevent Supabase auto-redirects
      await supabase.auth.signOut();

      toast({
        title: "Password updated",
        description: "Your password has been successfully reset.",
      });

      sessionStorage.setItem("passwordResetSuccess", "true");
      navigate("/password-reset/success");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = () => {
    const errors = form.formState.errors;
    const errorMessages = Object.values(errors)
      .map(error => error?.message)
      .filter(Boolean);
    
    if (errorMessages.length > 0) {
      toast({
        title: "Validation Error",
        description: errorMessages[0] as string,
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">Verifying reset link...</p>
        </Card>
      </div>
    );
  }

  // Expired / invalid token state
  if (tokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Reset Link Expired</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This password reset link has expired or has already been used. Please request a new one.
          </p>
          <Button asChild className="w-full bg-gradient-primary text-white hover:opacity-90">
            <Link to="/password-reset">Request New Link</Link>
          </Button>
          <div className="mt-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Return to login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create New Password</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Please enter your new password below
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-muted rounded-lg p-3 mb-6">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground">
              For your security, please choose a strong password that you haven't used before on SCOUT.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* New Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        className="pr-10"
                        placeholder="Enter new password"
                        autoComplete="new-password"
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
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${passwordStrengthColor}`}
                            style={{ width: `${(passwordStrength / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{passwordStrengthText}</span>
                      </div>
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Password Requirements */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Password Requirements:</p>
              <div className="space-y-1">
                <div className={`text-xs flex items-center space-x-2 ${password.length >= 8 ? "text-green-600" : "text-muted-foreground"}`}>
                  {password.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`text-xs flex items-center space-x-2 ${password.match(/[a-z]/) && password.match(/[A-Z]/) ? "text-green-600" : "text-muted-foreground"}`}>
                  {password.match(/[a-z]/) && password.match(/[A-Z]/) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Mix of uppercase and lowercase letters</span>
                </div>
                <div className={`text-xs flex items-center space-x-2 ${password.match(/[0-9]/) ? "text-green-600" : "text-muted-foreground"}`}>
                  {password.match(/[0-9]/) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>At least one number</span>
                </div>
                <div className={`text-xs flex items-center space-x-2 ${password.match(/[^a-zA-Z0-9]/) ? "text-green-600" : "text-muted-foreground"}`}>
                  {password.match(/[^a-zA-Z0-9]/) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>At least one special character</span>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        className="pr-10"
                        placeholder="Confirm new password"
                        autoComplete="new-password"
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
                  {confirmPassword && !form.formState.errors.confirmPassword && (
                    <p className={`text-xs mt-2 flex items-center space-x-1 ${password === confirmPassword ? "text-green-600" : "text-destructive"}`}>
                      {password === confirmPassword ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" />
                          <span>Passwords don't match</span>
                        </>
                      )}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Security Confirmation */}
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Your password will be securely encrypted and stored
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-white hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting Password..." : "Reset Password"}
            </Button>

            {/* Cancel Link */}
            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Cancel and return to login
              </Link>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default PasswordResetNewPassword;
