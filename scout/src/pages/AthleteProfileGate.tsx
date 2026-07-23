import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, ArrowRight, ShieldCheck, Loader2, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AthleteProfileGateProps {
  athleteId: string;
}

const RESEND_COOLDOWN = 60; // seconds

const AthleteProfileGate: React.FC<AthleteProfileGateProps> = ({ athleteId }) => {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendOtp = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (error) {
        const lowerMsg = error.message.toLowerCase();
        const isNotFound = lowerMsg.includes("signups not allowed") || lowerMsg.includes("not found") || lowerMsg.includes("otp_disabled");
        const msg = isNotFound
          ? "No account exists with this email. Please register first."
          : error.message.includes("rate limit")
          ? "Please wait a few minutes before requesting another code."
          : error.message;
        toast({ title: isNotFound ? "Account Not Found" : "Error", description: msg, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      setStep("code");
      setResendCooldown(RESEND_COOLDOWN);
      toast({ title: "Code Sent", description: `A 6-digit code has been sent to ${email}` });
    } catch (err) {
      console.error("OTP send error:", err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({ title: "Invalid Code", description: "Please enter the full 6-digit code", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        const msg = error.message.toLowerCase().includes("expired")
          ? "This code has expired. Please request a new one."
          : error.message.toLowerCase().includes("invalid")
          ? "Invalid code. Please check and try again."
          : error.message;
        toast({ title: "Verification Failed", description: msg, variant: "destructive" });
        setCode("");
        setIsLoading(false);
        return;
      }

      // Success — onAuthStateChange will fire SIGNED_IN,
      // AthleteProfileWrapper will re-render with authenticated state.
    } catch (err) {
      console.error("OTP verify error:", err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setCode("");
    sendOtp();
  };

  // ── Code input step ──
  if (step === "code") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription className="text-base mt-2">
              We sent a 6-digit code to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isLoading}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button className="w-full" onClick={handleVerify} disabled={isLoading || code.length !== 6}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & View Profile"
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCw className="h-3.5 w-3.5" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); }}
                className="text-muted-foreground hover:underline"
              >
                Use a different email
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Email input step ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">View Athlete Profile</CardTitle>
          <CardDescription className="text-base mt-2">
            Enter your email to receive a verification code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="coach@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send verification code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <p className="mt-4 text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <a
              href={`/login?redirect=${encodeURIComponent(`/athletes/${athleteId}`)}`}
              className="text-primary hover:underline"
            >
              Log in here
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AthleteProfileGate;
