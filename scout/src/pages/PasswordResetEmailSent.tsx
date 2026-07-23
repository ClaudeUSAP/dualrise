import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, Mail, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const PasswordResetEmailSent = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem("resetEmail");
    if (!storedEmail) {
      navigate("/password-reset");
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  useEffect(() => {
    // Start countdown timer
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleResend = async () => {
    setIsResending(true);
    setCanResend(false);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Email resent",
        description: "We've sent another password reset link to your email.",
      });
      setResendTimer(60);
      setIsResending(false);
    }, 1500);
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split("@");
    const maskedUsername = username.slice(0, 2) + "****";
    return `${maskedUsername}@${domain}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-green-600" />
        </div>

        {/* Title and Message */}
        <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We've sent password reset instructions to:
        </p>
        
        {/* Email Display */}
        <div className="bg-muted rounded-lg px-4 py-3 mb-6">
          <p className="font-medium text-foreground">{maskEmail(email)}</p>
        </div>

        {/* Instructions */}
        <div className="bg-card border rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-foreground mb-3 flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            Next Steps:
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the reset link in the email</li>
            <li>Create your new password</li>
            <li>Log in with your new credentials</li>
          </ol>
        </div>

        {/* Timing Information */}
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-6">
          <Clock className="h-4 w-4" />
          <span>Email typically arrives within 1-2 minutes</span>
        </div>

        {/* Resend Section */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Didn't receive the email?</span>
            </div>
          </div>

          {!canResend ? (
            <p className="text-sm text-muted-foreground">
              You can resend in {resendTimer} seconds
            </p>
          ) : (
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Reset Link
                </>
              )}
            </Button>
          )}
        </div>

        {/* Troubleshooting */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground text-left">
              <p className="font-medium text-foreground mb-1">Troubleshooting:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Verify the email address is correct</li>
                <li>Add noreply@coachcorner.com to your contacts</li>
                <li>Contact support if issues persist</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/login">
            <Button variant="ghost" className="w-full">
              Return to Login
            </Button>
          </Link>
          
          <p className="text-xs text-muted-foreground">
            Need immediate assistance? Contact Nico Paviet:{" "}
            <a href="mailto:nicolas@usathleticperformance.com" className="text-primary hover:underline">
              Email
            </a>
            {" | "}
            <a href="https://wa.me/18722790009" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PasswordResetEmailSent;