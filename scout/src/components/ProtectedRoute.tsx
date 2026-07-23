import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'coach' | 'admin' | 'agent';
  allowedRoles?: ('coach' | 'admin' | 'agent')[];
  skipProfileCheck?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, allowedRoles, skipProfileCheck }) => {
  const { isAuthenticated, hasRole, isLoading, userProfile, isProfileComplete } = useAuth();

  // Show loader while auth is loading or if we need profile for role check
  if (isLoading || ((requiredRole || allowedRoles) && isAuthenticated && !userProfile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Store the current path they were trying to access
    const redirectPath = window.location.pathname + window.location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  // Check if account is suspended
  if (userProfile && userProfile.status === 'suspended') {
    return <Navigate to="/account-suspended" replace />;
  }

  // Check allowedRoles first (takes priority over requiredRole)
  if (allowedRoles && userProfile) {
    const hasAllowedRole = allowedRoles.includes(userProfile.role as any);
    if (!hasAllowedRole) {
      // Redirect based on user's actual role
      if (userProfile.role === 'coach') {
        return <Navigate to="/dashboard" replace />;
      } else {
        return <Navigate to="/admin" replace />;
      }
    }
  } else if (requiredRole && userProfile) {
    // Legacy single role check
    if (requiredRole === 'admin' && userProfile.role !== 'admin' && userProfile.role !== 'agent') {
      return <Navigate to="/dashboard" replace />;
    }
    if (requiredRole === 'agent' && userProfile.role !== 'agent') {
      return <Navigate to="/admin" replace />;
    }
    if (requiredRole === 'coach' && userProfile.role !== 'coach') {
      return <Navigate to="/admin" replace />;
    }
  }

  // Coach profile completeness gate
  if (!skipProfileCheck && userProfile?.role === 'coach' && !isProfileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;