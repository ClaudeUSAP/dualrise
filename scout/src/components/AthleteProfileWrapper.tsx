import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AthleteDetail from "@/pages/AthleteDetail";
import AthleteProfileGate from "@/pages/AthleteProfileGate";
import { Loader2 } from "lucide-react";

const AthleteProfileWrapper: React.FC = () => {
  const { id } = useParams();
  const { isAuthenticated, isLoading, userProfile, isProfileComplete, isCoach } = useAuth();

  // Show loader while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated → remember this exact profile so login (any method)
  // returns here instead of the catalogue, then show the OTP gate
  if (!isAuthenticated) {
    if (id) sessionStorage.setItem("postLoginRedirect", `/athletes/${id}`);
    return <AthleteProfileGate athleteId={id || ""} />;
  }

  // Check if account is suspended or pending
  if (userProfile?.status === "suspended") {
    window.location.href = "/account-suspended";
    return null;
  }

  if (userProfile?.status === "pending") {
    window.location.href = "/account-pending";
    return null;
  }

  // Profile completion gate for first-time OTP users (coaches)
  if (isCoach && !isProfileComplete) {
    sessionStorage.setItem("postProfileRedirect", `/athletes/${id}`);
    return <Navigate to="/complete-profile" replace />;
  }

  // Authenticated and viewing the profile → the deep-link is consumed
  sessionStorage.removeItem("postLoginRedirect");
  return <AthleteDetail />;
};

export default AthleteProfileWrapper;
