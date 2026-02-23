import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Login from "./Login";

/**
 * Root route: show Login as the first screen when not authenticated;
 * when authenticated, redirect to the correct dashboard by role.
 */
const Home = () => {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (loading || !session) return;
    if (role === "pm") {
      navigate("/pm", { replace: true });
    } else if (role === "vendor") {
      navigate("/vendor", { replace: true });
    }
  }, [session, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecting…</p>
    </div>
  );
};

export default Home;
