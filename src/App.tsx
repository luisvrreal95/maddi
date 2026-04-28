import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { MapboxTokenProvider } from "@/contexts/MapboxTokenContext";
import { ReactNode, lazy, Suspense } from "react";
import LoadingState from "./components/ui/LoadingState";
import OnboardingModal from "./components/OnboardingModal";

// Lazy-loaded pages for better initial load performance
const Index = lazy(() => import("./pages/Index"));
const SearchPage = lazy(() => import("./pages/Search"));
const Auth = lazy(() => import("./pages/Auth"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const BusinessAnalytics = lazy(() => import("./pages/BusinessAnalytics"));
const BillboardDetail = lazy(() => import("./pages/BillboardDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Messages = lazy(() => import("./pages/Messages"));
const Reviews = lazy(() => import("./pages/Reviews"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const AdminAcceptInvite = lazy(() => import("./pages/AdminAcceptInvite"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ValorEspectacular = lazy(() => import("./pages/ValorEspectacular"));
const Terminos = lazy(() => import("./pages/Terminos"));
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Contacto = lazy(() => import("./pages/Contacto"));

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: 'owner' | 'business';
}) => {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState fullScreen />;

  if (!user) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // Role is still being fetched after auth state change
  if (requiredRole && userRole === null) return <LoadingState fullScreen />;

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
        <MapboxTokenProvider>
        <Sonner />
        <BrowserRouter>
          <OnboardingModal />
          <Suspense fallback={<LoadingState fullScreen />}>
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
          </Suspense>
        </BrowserRouter>
        </MapboxTokenProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
