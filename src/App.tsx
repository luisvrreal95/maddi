import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import SearchPage from "./pages/Search";
import Auth from "./pages/Auth";
import OwnerDashboard from "./pages/OwnerDashboard";
import AddProperty from "./pages/AddProperty";
import BusinessDashboard from "./pages/BusinessDashboard";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import BillboardDetail from "./pages/BillboardDetail";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import Reviews from "./pages/Reviews";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminAcceptInvite from "./pages/AdminAcceptInvite";
import ResetPassword from "./pages/ResetPassword";
import PublicProfile from "./pages/PublicProfile";
import ValorEspectacular from "./pages/ValorEspectacular";
import Terminos from "./pages/Terminos";
import Privacidad from "./pages/Privacidad";
import Contacto from "./pages/Contacto";

const queryClient = new QueryClient();

const AuthSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: 'owner' | 'business';
}) => {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthSpinner />;

  if (!user) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // Role is still being fetched after auth state change
  if (requiredRole && userRole === null) return <AuthSpinner />;

  if (requiredRole === 'owner' && userRole !== 'owner') {
    return <Navigate to="/business" replace />;
  }
  if (requiredRole === 'business' && userRole !== 'business') {
    return <Navigate to="/owner" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/billboard/:id" element={<BillboardDetail />} />
            <Route path="/valor-espectacular" element={<ValorEspectacular />} />
            <Route path="/terminos" element={<Terminos />} />
            <Route path="/privacidad" element={<Privacidad />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />
            <Route path="/admin/accept-invite" element={<AdminAcceptInvite />} />

            {/* Auth-only routes */}
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Owner-only routes */}
            <Route path="/owner" element={<ProtectedRoute requiredRole="owner"><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner/add-property" element={<ProtectedRoute requiredRole="owner"><AddProperty /></ProtectedRoute>} />

            {/* Business-only routes */}
            <Route path="/business" element={<ProtectedRoute requiredRole="business"><BusinessDashboard /></ProtectedRoute>} />
            <Route path="/business-analytics" element={<ProtectedRoute requiredRole="business"><BusinessAnalytics /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
