import { Link } from "react-router-dom";
import { CheckCircle, Clock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const RegistrationSuccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Card className="w-full max-w-2xl p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Application Submitted Successfully!
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8">
          Thank you for registering with SCOUT. Your application has been received and is pending approval.
        </p>

        {/* What's Next Section */}
        <div className="bg-muted rounded-lg p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-foreground mb-4">What happens next?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Application Review</h3>
                <p className="text-sm text-muted-foreground">
                  Our team at Dual Rise will review your application within 24-48 hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Verification Process</h3>
                <p className="text-sm text-muted-foreground">
                  We'll verify your coaching credentials and institutional affiliation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Account Activation</h3>
                <p className="text-sm text-muted-foreground">
                  Once approved, you'll receive an email with your login credentials and next steps.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-4">
            <Clock className="h-8 w-8 text-primary mb-2 mx-auto" />
            <h3 className="font-medium text-foreground mb-1">Processing Time</h3>
            <p className="text-sm text-muted-foreground">24-48 hours</p>
          </div>
          
          <div className="bg-card border rounded-lg p-4">
            <Mail className="h-8 w-8 text-primary mb-2 mx-auto" />
            <h3 className="font-medium text-foreground mb-1">Check Your Email</h3>
            <p className="text-sm text-muted-foreground">Confirmation will be sent</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/">
            <Button className="w-full md:w-auto bg-gradient-primary text-white hover:opacity-90">
              Return to Homepage
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          
          <div>
            <p className="text-sm text-muted-foreground">
              Have questions? Contact us at{" "}
              <a href="mailto:nicolas@usathleticperformance.com" className="text-primary hover:underline">
                nicolas@usathleticperformance.com
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegistrationSuccess;