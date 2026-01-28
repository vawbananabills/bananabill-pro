import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalKeyboardShortcuts } from "@/components/GlobalKeyboardShortcuts";
import { GlobalPaymentDialog } from "@/components/payments/GlobalPaymentDialog";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewInvoice from "./pages/NewInvoice";
import EditInvoice from "./pages/EditInvoice";
import Invoices from "./pages/Invoices";
import Customers from "./pages/Customers";
import Vendors from "./pages/Vendors";
import Products from "./pages/Products";
import Units from "./pages/Units";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import Payments from "./pages/Payments";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalKeyboardShortcuts />
          <GlobalPaymentDialog />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/invoice/new" element={
              <ProtectedRoute><NewInvoice /></ProtectedRoute>
            } />
            <Route path="/invoice/edit/:id" element={
              <ProtectedRoute><EditInvoice /></ProtectedRoute>
            } />
            <Route path="/invoices" element={
              <ProtectedRoute><Invoices /></ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute><Customers /></ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute><Vendors /></ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute><Products /></ProtectedRoute>
            } />
            <Route path="/units" element={
              <ProtectedRoute><Units /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute><Reports /></ProtectedRoute>
            } />
            <Route path="/payments" element={
              <ProtectedRoute><Payments /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
            <Route path="/super-admin" element={
              <ProtectedRoute><SuperAdmin /></ProtectedRoute>
            } />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
