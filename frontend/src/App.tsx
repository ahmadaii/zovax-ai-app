import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "./components/DashboardLayout.tsx";
import Search from "./pages/dashboard/Search.tsx";
import SearchResults from "./pages/dashboard/SearchResults.tsx";
import Analytics from "./pages/dashboard/Analytics.tsx";
import KnowledgeBase from "./pages/dashboard/KnowledgeBase.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TenantProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Search />} />
              <Route path="search" element={<Search />} />
              <Route
                path="search/results/:searchId"
                element={<SearchResults />}
              />
              <Route path="analytics" element={<Analytics />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TenantProvider>
  </QueryClientProvider>
);

export default App;
