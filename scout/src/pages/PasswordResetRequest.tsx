import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, ArrowLeft, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { passwordResetRequestSchema, type PasswordResetRequestFormValues } from "@/lib/validation/passwordResetForm";
import { AUTH_ROUTES } from "@/constants/routes";

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: PasswordResetRequestFormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}${AUTH_ROUTES.PASSWORD_RESET_NEW}`,
      });

      if (error) throw error;

      // Store email for the confirmation page
      sessionStorage.setItem("resetEmail", data.email);
      navigate("/password-reset/email-sent");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    const errorMessages = Object.entries(errors)
      .map(([field, error]: [string, any]) => `Email: ${error.message}`)
      .join(". ");
    
    toast({
      title: "Validation Error",
      description: errorMessages,
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
        </div>

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reset Your Password</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your email address and we'll send you instructions to reset your password
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="coach@university.edu"
                        autoComplete="email"
                        autoFocus
                        className="pl-10"
                        {...field}
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter the email address associated with your SCOUT account
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

          {/* Security Information */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Lock className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Security Information:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Reset link expires in 1 hour</li>
                  <li>Link can only be used once</li>
                  <li>You'll be notified at this email address</li>
                </ul>
              </div>
            </div>
          </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-white hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>

            {/* Additional Help */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Return to login
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                Need help? Contact Nico Paviet:{" "}
                <a href="mailto:nicolas@usathleticperformance.com" className="text-primary hover:underline">
                  Email
                </a>
                {" | "}
                <a href="https://wa.me/18722790009" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp (+1 872 279 0009)
                </a>
              </p>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default PasswordResetRequest;