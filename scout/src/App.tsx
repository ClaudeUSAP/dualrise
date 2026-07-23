import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Athletes from "./pages/Athletes";
import Register from "./pages/Register";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import PasswordResetRequest from "./pages/PasswordResetRequest";
import PasswordResetEmailSent from "./pages/PasswordResetEmailSent";
import PasswordResetNewPassword from "./pages/PasswordResetNewPassword";
import PasswordResetSuccess from "./pages/PasswordResetSuccess";
import AccountPending from "./pages/AccountPending";
import AccountSuspended from "./pages/AccountSuspended";
import Login from "./pages/Login";
import AthleteDetail from "./pages/AthleteDetail";
import AthleteProfileWrapper from "./components/AthleteProfileWrapper";

import AdminAthleteDetail from "./pages/admin/AdminAthleteDetail";
import AdminAthleteView from './pages/admin/AdminAthleteView';
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Favorites from "./pages/Favorites";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import SavedSearches from "./pages/SavedSearches";
import NotificationCenter from "./pages/NotificationCenter";
import TournamentSearch from "./pages/TournamentSearch";
import CoachTournamentLeaderboard from "./pages/TournamentLeaderboard";
import Resources from "./pages/Resources";
import TournamentManagement from "./pages/admin/TournamentManagement";
import TournamentResults from "./pages/admin/TournamentResults";
import AddNewTournament from "./pages/admin/AddNewTournament";
import EditTournament from "./pages/admin/EditTournament";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CoachManagement from "./pages/admin/CoachManagement";
import AddNewCoach from "./pages/admin/AddNewCoach";
import AthleteManagement from "./pages/admin/AthleteManagement";
import AddNewAthlete from "./pages/admin/AddNewAthlete";
import CoachDetails from "./pages/admin/CoachDetails";
import TournamentResultsEntry from "./pages/admin/TournamentResultsEntry";
import TournamentLeaderboard from "./pages/admin/TournamentLeaderboard";
import TournamentDeduplication from "./pages/admin/TournamentDeduplication";
import ContactRequestsManagement from "./pages/admin/ContactRequestsManagement";
import AnalyticsReports from "./pages/admin/AnalyticsReports";
import SystemSettings from "./pages/admin/SystemSettings";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import DataImportExport from "./pages/admin/DataImportExport";
import UniversityManagement from "./pages/admin/UniversityManagement";
import Demo from "./pages/Demo";
import DemoAthleteDetail from "./pages/DemoAthleteDetail";
import MyContactRequests from "./pages/MyContactRequests";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import MentionsLegales from "./pages/MentionsLegales";
import PrivacyEn from "./pages/PrivacyEn";
import CompleteProfile from "./pages/CompleteProfile";
import CookieBanner from "./components/CookieBanner";
import Footer from "./components/Footer";
const queryClient = new QueryClient();

// Layout wrapper that conditionally shows Navbar for public routes
const PublicLayout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <>
      {isHomePage && <Navbar />}
      <Outlet />
      {/* Home already has its own full footer with legal links */}
      {!isHomePage && <Footer />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes with conditional Navbar */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/demo/:id" element={<DemoAthleteDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/privacy" element={<PolitiqueConfidentialite />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/privacy-en" element={<PrivacyEn />} />
              <Route path="/password-reset" element={<PasswordResetRequest />} />
              <Route path="/password-reset/email-sent" element={<PasswordResetEmailSent />} />
              <Route path="/password-reset/new-password" element={<PasswordResetNewPassword />} />
              <Route path="/password-reset/success" element={<PasswordResetSuccess />} />
              <Route path="/account-pending" element={<AccountPending />} />
              <Route path="/account-suspended" element={<AccountSuspended />} />
              <Route path="/complete-profile" element={
                <ProtectedRoute skipProfileCheck>
                  <CompleteProfile />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Protected routes with Sidebar layout - Coach only */}
            <Route element={<AuthenticatedLayout />}>
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRole="coach">
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/athletes" element={
                <ProtectedRoute requiredRole="coach">
                  <Athletes />
                </ProtectedRoute>
              } />
              <Route path="/athletes/:id" element={<AthleteProfileWrapper />} />
              <Route path="/favorites" element={
                <ProtectedRoute requiredRole="coach">
                  <Favorites />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requiredRole="coach">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/notification-center" element={
                <ProtectedRoute requiredRole="coach">
                  <NotificationCenter />
                </ProtectedRoute>
              } />
              <Route path="/saved-searches" element={
                <ProtectedRoute requiredRole="coach">
                  <SavedSearches />
                </ProtectedRoute>
              } />
              <Route path="/my-contact-requests" element={
                <ProtectedRoute allowedRoles={['coach', 'admin']}>
                  <MyContactRequests />
                </ProtectedRoute>
              } />
              <Route path="/tournament-search" element={
                <ProtectedRoute requiredRole="coach">
                  <TournamentSearch />
                </ProtectedRoute>
              } />
              <Route path="/tournament-leaderboard/:id" element={
                <ProtectedRoute requiredRole="coach">
                  <CoachTournamentLeaderboard />
                </ProtectedRoute>
              } />
              <Route path="/resources" element={
                <ProtectedRoute allowedRoles={['coach', 'admin', 'agent']}>
                  <Resources />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Admin routes with AdminLayout */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/coaches" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CoachManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/coaches/new" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AddNewCoach />
                </ProtectedRoute>
              } />
              <Route path="/admin/coaches/:coachId" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CoachDetails />
                </ProtectedRoute>
              } />
              <Route path="/admin/universities" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UniversityManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/coaches/:coachId/edit" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AddNewCoach />
                </ProtectedRoute>
              } />
              <Route path="/admin/coaches/:coachId/activity" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CoachDetails />
                </ProtectedRoute>
              } />
              <Route path="/admin/athletes" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AthleteManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/athletes/import" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <DataImportExport />
                </ProtectedRoute>
              } />
              <Route path="/admin/athletes/new" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AddNewAthlete />
                </ProtectedRoute>
              } />
              <Route path="/admin/athletes/:id/view" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AdminAthleteView />
                </ProtectedRoute>
              } />
              <Route path="/admin/athletes/:id/edit" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AdminAthleteDetail />
                </ProtectedRoute>
              } />
              <Route path="/admin/athletes/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <AdminAthleteDetail />
                </ProtectedRoute>
              } />
            <Route path="/admin/tournaments" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <TournamentManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/tournaments/new" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <AddNewTournament />
              </ProtectedRoute>
            } />
            <Route path="/admin/tournaments/:id/edit" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <EditTournament />
              </ProtectedRoute>
            } />
            <Route path="/admin/tournaments/:id/leaderboard" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <TournamentLeaderboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/tournament-deduplication" element={
              <ProtectedRoute allowedRoles={['admin', 'agent']}>
                <TournamentDeduplication />
              </ProtectedRoute>
            } />
              <Route path="/admin/tournaments/:tournamentId/results" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <TournamentResultsEntry />
                </ProtectedRoute>
              } />
              <Route path="/admin/tournament-results" element={
                <ProtectedRoute allowedRoles={['admin', 'agent']}>
                  <TournamentResults />
                </ProtectedRoute>
              } />
              <Route path="/admin/contact-requests" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContactRequestsManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AnalyticsReports />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SystemSettings />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUserManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/data" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DataImportExport />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
