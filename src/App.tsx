import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import SearchPage from "./pages/Search";
import Auth from "./pages/Auth";
import OwnerDashboard from "./pages/OwnerDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import BillboardDetail from "./pages/BillboardDetail";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/business" element={<BusinessDashboard />} />
              <Route path="/business-analytics" element={<BusinessAnalytics />} />
              <Route path="/billboard/:id" element={<BillboardDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/messages" element={<Messages />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
