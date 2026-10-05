import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

import AlertWorkbenchPage from "./pages/AlertWorkbenchPage";
import AlertDetailsPage from "./pages/AlertDetailsPage";
import TriageQueuePage from "./pages/TriageQueuePage";
import STRReviewQueuePage from "./pages/STRReviewQueuePage";
import CasesPage from "./pages/CasesPage";
import CaseWorkspacePage from "./pages/CaseWorkspacePage";
import AuditTrailPage from "./pages/AuditTrailPage";
import ModelGovernancePage from "./pages/ModelGovernancePage";
import ModelGovernancePrintPage from "./pages/ModelGovernancePrintPage";
import RulesEnginePage from "./pages/RulesEnginePage";
import ReferenceDataPage from "./pages/ReferenceDataPage";
import Customer360Page from "./pages/Customer360Page";
import WorkforceManagementPage from "./pages/WorkforceManagementPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Don't retry requests the server has refused or can't find (e.g. a record outside your scope).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) =>
        ![403, 404].includes(error?.response?.status) && failureCount < 3,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      
      <Route path="/alerts/workbench" element={<ProtectedRoute><AlertWorkbenchPage /></ProtectedRoute>} />
      <Route path="/triage" element={<ProtectedRoute><TriageQueuePage /></ProtectedRoute>} />
      <Route path="/alerts/:alertId" element={<ProtectedRoute><AlertDetailsPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customer360Page /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
      <Route path="/cases/:caseId" element={<ProtectedRoute><CaseWorkspacePage /></ProtectedRoute>} />
      <Route path="/str" element={<ProtectedRoute><STRReviewQueuePage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AuditTrailPage /></ProtectedRoute>} />
      <Route path="/ml-status" element={<ProtectedRoute><ModelGovernancePage /></ProtectedRoute>} />
      <Route path="/ml-status/print" element={<ProtectedRoute><ModelGovernancePrintPage /></ProtectedRoute>} />
      {/* Redirect legacy routes */}
      <Route path="/mlops" element={<Navigate to="/ml-status" replace />} />
      <Route path="/model-tuning" element={<Navigate to="/ml-status" replace />} />
      <Route path="/rules-engine" element={<ProtectedRoute><RulesEnginePage /></ProtectedRoute>} />
      <Route path="/reference-data" element={<ProtectedRoute><ReferenceDataPage /></ProtectedRoute>} />
      <Route path="/workforce" element={<ProtectedRoute><WorkforceManagementPage /></ProtectedRoute>} />
      <Route path="/users" element={<Navigate to="/workforce" replace />} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
