import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, Shield, HelpCircle, RefreshCw, Mail, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const RESEND_COOLDOWN_KEY = 'resend_confirmation_cooldown';
const COOLDOWN_DURATION = 60; // seconds

const AccountPending = () => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{
    email: string;
    created_at: string;
    status: string;
  } | null>(null);

  // Initialize cooldown from localStorage
  useEffect(() => {
    const storedCooldown = localStorage.getItem(RESEND_COOLDOWN_KEY);
    if (storedCooldown) {
      const remainingTime = Math.max(0, Math.floor((parseInt(storedCooldown) - Date.now()) / 1000));
      if (remainingTime > 0) {
        setResendCooldown(remainingTime);
      } else {
        localStorage.removeItem(RESEND_COOLDOWN_KEY);
      }
    }
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            localStorage.removeItem(RESEND_COOLDOWN_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('email, created_at, status')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: "Error",
          description: "Failed to load application data.",
          variant: "destructive",
        });
      } else {
        setUserData(data);
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, [user]);

  const handleResendEmail = useCallback(async () => {
    if (!userData?.email || resendCooldown > 0) return;
    
    setIsResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/account-pending`,
        }
      });

      if (error) {
        // Handle rate limit specifically
        if (error.message?.toLowerCase().includes('rate limit') || 
            error.message?.toLowerCase().includes('too many') ||
            error.message?.toLowerCase().includes('over_email_send_rate_limit')) {
          toast({
            title: "Too Many Requests",
            description: "Please wait a few minutes before requesting another email.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Confirmation Email Sent",
          description: "Please check your inbox and spam folder.",
        });
        
        // Set cooldown
        const cooldownEnd = Date.now() + (COOLDOWN_DURATION * 1000);
        localStorage.setItem(RESEND_COOLDOWN_KEY, cooldownEnd.toString());
        setResendCooldown(COOLDOWN_DURATION);
      }
    } catch (error: any) {
      console.error('Error resending confirmation email:', error);
      toast({
        title: "Failed to Send Email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  }, [userData?.email, resendCooldown]);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to refresh status.",
        variant: "destructive",
      });
    } else {
      setUserData(prev => prev ? { ...prev, status: data.status } : null);
      toast({
        title: "Status Updated",
        description: data.status === 'pending' 
          ? "Your application is still under review. We'll notify you via email once approved."
          : "Your status has been updated.",
      });
    }
    
    setIsRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application status...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Needs Attention</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">SCOUT by Dual Rise</h1>
                <p className="text-xs text-muted-foreground">Application Status</p>
              </div>
            </div>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Main Status Card */}
        <Card className="p-8 mb-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Application Under Review</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Thank you for your interest in SCOUT by Dual Rise! Our team at Dual Rise is carefully reviewing your application to ensure the best experience for all coaches on our platform.
            </p>
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link to="/">
                  Go Back to Homepage
                </Link>
              </Button>
            </div>
          </div>

          {/* Status Details */}
          <div className="bg-muted rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Application Submitted</p>
                <p className="font-medium text-foreground">
                  {userData?.created_at ? formatDate(new Date(userData.created_at)) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Estimated Review Time</p>
                <p className="font-medium text-foreground">24-48 hours</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Application Email</p>
                <p className="font-medium text-foreground">{userData?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                {userData?.status && getStatusBadge(userData.status)}
              </div>
            </div>
          </div>

          {/* Check Spam Alert */}
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Haven't received an email?</strong> Check your spam/junk folder. 
              Emails may take a few minutes to arrive. If you still don't see it, use the button below to resend.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="flex-1"
              variant="outline"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Application Status
                </>
              )}
            </Button>
            <Button 
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="flex-1"
              variant="outline"
            >
              {isResending ? (
                <>
                  <Mail className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Confirmation Email
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Next Steps Section */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">What Happens During Review?</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Credential Verification</h4>
                <p className="text-sm text-muted-foreground">
                  We verify your coaching position and university affiliation to ensure platform security.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Profile Review</h4>
                <p className="text-sm text-muted-foreground">
                  Our team reviews your profile information and recruiting needs to provide the best experience.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Account Activation</h4>
                <p className="text-sm text-muted-foreground">
                  Once approved, you'll receive an email with your login credentials and onboarding information.
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Email Notification</p>
                <p className="text-xs text-muted-foreground">
                  You'll receive an email at <span className="font-medium">{userData?.email}</span> as soon as your application is processed.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* FAQ Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-3">Frequently Asked Questions</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Why does approval take 24-48 hours?</p>
                <p className="text-xs text-muted-foreground">
                  We manually verify each coach to maintain platform quality and security.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Can I expedite my application?</p>
                <p className="text-xs text-muted-foreground">
                  For urgent requests, contact our support team with your university details.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">What if my application is denied?</p>
                <p className="text-xs text-muted-foreground">
                  We'll provide specific feedback and steps to reapply if eligible.
                </p>
              </div>
            </div>
          </Card>

          {/* Platform Features Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-3">What You'll Get Access To</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm text-muted-foreground">Pre-vetted French & international tennis athletes</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm text-muted-foreground">Complete academic and athletic profiles</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm text-muted-foreground">Advanced search and filtering tools</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm text-muted-foreground">Direct contact facilitation</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm text-muted-foreground">Tournament performance tracking</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Contact Support */}
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Need Immediate Assistance?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Contact Nico Paviet at Dual Rise for urgent inquiries.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href="mailto:nicolas@usathleticperformance.com" className="text-sm text-primary hover:underline">
                    nicolas@usathleticperformance.com
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <a href="https://wa.me/18722790009" className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    WhatsApp: +1 872 279 0009
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Monday-Friday, 9 AM - 6 PM EST</span>
                </div>
              </div>
            </div>
            <Button className="bg-gradient-primary text-white hover:opacity-90">
              <HelpCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccountPending;