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

  if (!session) return <Navigate to="/" replace />;

  if (allowedRole && role !== allowedRole) {
    if (role === "pm") return <Navigate to="/pm" replace />;
    if (role === "vendor") return <Navigate to="/vendor" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
