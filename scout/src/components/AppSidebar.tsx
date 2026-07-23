import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  Users, 
  Heart, 
  LayoutDashboard, 
  Settings,
  LogOut,
  Shield,
  User,
  Bell,
  BookOpen,
  UserCog,
  Trophy,
  Mail,
  BarChart3,
  Database,
  UserCheck,
  Search,
  PanelLeftClose,
  PanelLeft,
  UserPlus,
  Upload,
  Merge,
  Flag,
  GraduationCap,
  MessageSquare,
  Building2,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const AppSidebar = ({ variant = 'auto' }: { variant?: 'admin' | 'coach' | 'agent' | 'auto' }) => {
  const location = useLocation();
  const { user, userProfile, logout, hasRole, isAdmin, isAgent, isCoach } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unverifiedUniversitiesCount, setUnverifiedUniversitiesCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch unverified universities count (admin only)
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchUnverifiedCount = async () => {
      const { count } = await supabase
        .from('universities')
        .select('*', { count: 'exact', head: true })
        .eq('verified', false);
      
      setUnverifiedUniversitiesCount(count || 0);
    };

    fetchUnverifiedCount();
  }, [user, isAdmin]);

  const shouldShowAdminNav = variant === 'admin' ? true : 
                            variant === 'agent' ? true :
                            variant === 'coach' ? false : 
                            (isAdmin || isAgent);

  // Admin navigation items - matching the screenshot
  const adminNavItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, badge: 0 },
    { title: "Coach Management", url: "/admin/coaches", icon: UserCog, badge: 0 },
    { title: "Universities", url: "/admin/universities", icon: Building2, badge: unverifiedUniversitiesCount },
    { title: "Athlete Management", url: "/admin/athletes", icon: Users, badge: 0 },
    { title: "Tournament Management", url: "/admin/tournaments", icon: Trophy, badge: 0 },
    { title: "Tournament Results", url: "/admin/tournament-results", icon: Trophy, badge: 0 },
    { title: "Contact Requests", url: "/admin/contact-requests", icon: Mail, badge: 0 },
    { title: "Analytics & Reports", url: "/admin/analytics", icon: BarChart3, badge: 0 },
    { title: "Data Import/Export", url: "/admin/data", icon: Database, badge: 0 },
    { title: "Users", url: "/admin/users", icon: UserCheck, badge: 0 },
    { title: "Resources", url: "/resources", icon: GraduationCap, badge: 0 },
    { title: "Ranking & Impact Story", url: "https://story.usathleticperformance.com/", icon: TrendingUp, badge: 0, external: true, tooltip: "Coach/parent-facing narrative — how French players transition to the US" },
    { title: "System Settings", url: "/admin/settings", icon: Settings, badge: 0 },
  ];

  // Agent navigation items - limited access
  const agentNavItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, badge: 0 },
    { title: "Athlete Management", url: "/admin/athletes", icon: Users, badge: 0 },
    { title: "Tournament Management", url: "/admin/tournaments", icon: Trophy, badge: 0 },
    { title: "Tournament Results", url: "/admin/tournament-results", icon: Trophy, badge: 0 },
    { title: "Resources", url: "/resources", icon: GraduationCap, badge: 0 },
    { title: "Ranking & Impact Story", url: "https://story.usathleticperformance.com/", icon: TrendingUp, badge: 0, external: true, tooltip: "Coach/parent-facing narrative — how French players transition to the US" },
    { title: "System Settings", url: "/admin/settings", icon: Settings, badge: 0 },
  ];

  // Coach navigation items
  const coachNavItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, badge: 0 },
    { title: "Athletes", url: "/athletes", icon: Users, badge: 0 },
    { title: "Favorites", url: "/favorites", icon: Heart, badge: 0 },
    { title: "My Contact Requests", url: "/my-contact-requests", icon: MessageSquare, badge: 0 },
    { title: "Tournament Search", url: "/tournament-search", icon: Trophy, badge: 0 },
    { title: "Resources", url: "/resources", icon: GraduationCap, badge: 0 },
    { title: "Saved Searches", url: "/saved-searches", icon: BookOpen, badge: 0 },
    { title: "Notifications", url: "/notification-center", icon: Bell, badge: unreadCount },
    { title: "Settings", url: "/settings", icon: Settings, badge: 0 },
  ];

  const navItems = isAgent ? agentNavItems : shouldShowAdminNav ? adminNavItems : coachNavItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state !== "collapsed" && (
              <div>
                <h2 className="text-lg font-bold text-sidebar-foreground">SCOUT</h2>
                <p className="text-xs text-sidebar-foreground/70">by Dual Rise</p>
              </div>
            )}
          </div>
          <SidebarTrigger className="h-6 w-6" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isExternal = 'external' in item && item.external;
                const isActive = !isExternal && (location.pathname === item.url ||
                               (location.pathname.startsWith(item.url) && item.url !== '/admin'));

                const linkClassName = cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                );

                const linkContent = (
                  <>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {'badge' in item && item.badge > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {isExternal ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={'tooltip' in item ? item.tooltip : undefined}
                          className={linkClassName}
                        >
                          {linkContent}
                        </a>
                      ) : (
                        <NavLink
                          to={item.url}
                          onClick={() => {
                            if (isMobile) {
                              setOpenMobile(false);
                            }
                          }}
                          className={linkClassName}
                        >
                          {linkContent}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {user && (
          <div className="space-y-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full">
                    <User className="h-4 w-4" />
                    {state !== "collapsed" && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">
                          {userProfile?.first_name || 'User'} {userProfile?.last_name || ''}
                        </p>
                        <p className="text-xs text-sidebar-foreground/70 truncate">{userProfile?.role || 'coach'}</p>
                      </div>
                    )}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    {state !== "collapsed" && <span>Logout</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;