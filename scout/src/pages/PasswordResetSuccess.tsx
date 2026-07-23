import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, Shield, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PasswordResetSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from the password reset flow
    const resetSuccess = sessionStorage.getItem("passwordResetSuccess");
    if (!resetSuccess) {
      navigate("/login");
      return;
    }
    // Clear the success flag
    sessionStorage.removeItem("passwordResetSuccess");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Your password has been successfully changed. You can now log in with your new password.
        </p>

        {/* Security Confirmation */}
        <div className="bg-muted rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <Lock className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground mb-1">Account Secured</p>
              <p className="text-xs text-muted-foreground">
                Your account has been secured with your new password. For your security, you've been logged out of all other sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Login Form */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Ready to Continue?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Log in with your new password to access your dashboard
          </p>
          <Link to="/login">
            <Button className="w-full bg-gradient-primary text-white hover:opacity-90">
              Go to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Additional Options */}
        <div className="space-y-2">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground block">
            Return to Homepage
          </Link>
          <p className="text-xs text-muted-foreground">
            Having trouble? Contact Nico Paviet:{" "}
            <a href="mailto:nicplancha@gmail.com" className="text-primary hover:underline">
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

export default PasswordResetSuccess;