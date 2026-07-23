import { Link, useLocation, useNavigate } from "react-router-dom";
import { Trophy, Users, LayoutDashboard, User, LogIn, Menu, X, LogOut, Shield, Flag, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userProfile, logout, hasRole } = useAuth();
  
  const navLinks = [
    { href: "/", label: "Home", icon: Trophy },
    ...(user ? [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/athletes", label: "Athletes", icon: Users },
      ...(hasRole('coach') ? [{ href: "/resources", label: "Resources", icon: GraduationCap }] : []),
      { href: hasRole('admin') ? "/admin/tournaments" : "/tournament-search", label: "Tournaments", icon: Flag },
      ...(hasRole('admin') ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    ] : []),
  ];
  
  const isActive = (path: string) => location.pathname === path;
  
  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };
  
  return (
    <nav className="sticky top-0 z-50 bg-usap-blue backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              SCOUT by <span className="hidden lg:inline">Dual Rise</span><span className="lg:hidden">Dual Rise</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-white/70">
                    Welcome, {userProfile?.first_name || userProfile?.email || 'User'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm" 
                  className="bg-white text-usap-blue hover:bg-white/90"
                  onClick={() => navigate('/login')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Log in
                </Button>
              )}
            </div>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                    isActive(link.href)
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
              
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                {user ? (
                  <>
                    <span className="text-sm text-white/70 px-4">
                      Logged in as {userProfile?.first_name || 'User'} {userProfile?.last_name || ''}
                    </span>
                    <Button variant="ghost" className="w-full text-white hover:bg-white/10" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full bg-white text-usap-blue hover:bg-white/90"
                    onClick={() => navigate('/login')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Log in
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;