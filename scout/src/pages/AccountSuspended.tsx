import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const AccountSuspended = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:nicplancha@gmail.com?subject=Account Suspension Inquiry";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-destructive/20">
        <CardContent className="pt-8 pb-8 px-6 sm:px-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
              <div className="relative bg-destructive/10 p-6 rounded-full border border-destructive/30">
                <Shield className="h-16 w-16 text-destructive" />
              </div>
            </div>

            {/* Status Badge */}
            <Badge variant="destructive" className="text-sm px-4 py-1.5 font-semibold">
              Account Suspended
            </Badge>

            {/* Main Message */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Your Account Has Been Suspended
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Your access to the Dual Rise Scout platform has been temporarily suspended.
              </p>
            </div>

            {/* Information Section */}
            <div className="w-full bg-muted/50 rounded-lg p-6 space-y-4 border border-border/50">
              <div className="space-y-2">
                <h2 className="font-semibold text-lg text-foreground flex items-center justify-center gap-2">
                  What This Means
                </h2>
                <p className="text-muted-foreground text-sm">
                  You currently cannot access athlete profiles, search functionality, or other platform features.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="font-semibold text-lg text-foreground flex items-center justify-center gap-2">
                  Next Steps
                </h2>
                <p className="text-muted-foreground text-sm">
                  If you believe this suspension is in error, please contact our support team immediately. We're here to help resolve any issues.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="w-full bg-card rounded-lg p-6 border border-border space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">Contact Support</span>
              </div>
              <p className="text-foreground font-semibold">
                nicplancha@gmail.com
              </p>
              <Button 
                onClick={handleContactSupport}
                className="w-full"
                size="lg"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </Button>
            </div>

            {/* Sign Out Button */}
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full max-w-xs"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>

            {/* Footer Note */}
            <p className="text-xs text-muted-foreground pt-4">
              For immediate assistance, please include your account email address in your message.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSuspended;
