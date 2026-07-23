import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TopBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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

    const channel = supabase
      .channel('top-bar-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="md:hidden sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-4 lg:px-6">
      <SidebarTrigger className="h-6 w-6 text-sidebar-foreground" />
      
      <div className="flex-1" />
      
      <Button 
        variant="ghost" 
        size="icon"
        className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        onClick={() => navigate('/notification-center')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};
