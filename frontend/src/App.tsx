import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AppProvider } from "@/context/TaskContext";
import { DemoVendorProvider } from "@/context/DemoVendorContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import VendorDashboard from "./pages/VendorDashboard";
import VendorDemoDashboard from "./pages/VendorDemoDashboard";
import TaskDetail from "./pages/TaskDetail";
import VendorDemoTaskDetail from "./pages/VendorDemoTaskDetail";
import PMLayout from "./pages/pm/PMLayout";
import PMDashboard from "./pages/pm/PMDashboard";
import PMTasks from "./pages/pm/PMTasks";
import PMVendors from "./pages/pm/PMVendors";
import PMUnits from "./pages/pm/PMUnits";
import PMUnitDetail from "./pages/pm/PMUnitDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Vendor routes */}
            <Route path="/vendor" element={<ProtectedRoute allowedRole="vendor"><VendorDashboard /></ProtectedRoute>} />
            <Route path="/unit/:unitId/task/:taskId" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />

            {/* Static vendor demo (no backend, no login) — one provider so state persists when navigating */}
            <Route path="/vendor-demo" element={<DemoVendorProvider><Outlet /></DemoVendorProvider>}>
              <Route index element={<VendorDemoDashboard />} />
              <Route path="unit/:unitId/task/:taskId" element={<VendorDemoTaskDetail />} />
            </Route>

            {/* Property Manager routes */}
            <Route path="/pm" element={<ProtectedRoute allowedRole="pm"><PMLayout /></ProtectedRoute>}>
              <Route index element={<PMDashboard />} />
              <Route path="tasks" element={<PMTasks />} />
              <Route path="vendors" element={<PMVendors />} />
              <Route path="units" element={<PMUnits />} />
              <Route path="units/:unitId" element={<PMUnitDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
