import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";

interface Props {
  children: React.ReactNode;
  allowedRole?: AppRole;
}

const ProtectedRoute = ({ children, allowedRole }: Props) => {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (allowedRole && role !== allowedRole) {
    // Redirect to the correct dashboard
    if (role === "pm") return <Navigate to="/pm" replace />;
    if (role === "vendor") return <Navigate to="/vendor" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
