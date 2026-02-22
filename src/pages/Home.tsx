import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Home = () => {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate("/login", { replace: true });
    } else if (role === "pm") {
      navigate("/pm", { replace: true });
    } else if (role === "vendor") {
      navigate("/vendor", { replace: true });
    }
  }, [session, role, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting…</p>
    </div>
  );
};

export default Home;
