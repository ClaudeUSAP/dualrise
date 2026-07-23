import { Outlet } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from '@/components/AppSidebar';
import { TopBar } from '@/components/TopBar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useIsTablet } from '@/hooks/use-mobile';

const AuthenticatedLayout = () => {
  const { isAuthenticated } = useAuth();
  const isTablet = useIsTablet();

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <SidebarProvider defaultOpen={!isTablet}>
      <div className="min-h-screen flex w-full relative">
        <AppSidebar variant="auto" />
        
        <main className="flex-1 min-w-0 flex flex-col w-full">
          <TopBar />
          <div className="flex-1 overflow-auto w-full flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <Footer />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AuthenticatedLayout;