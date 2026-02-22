import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ClipboardList, Users, Building2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/pm", icon: LayoutDashboard },
  { label: "Tasks", path: "/pm/tasks", icon: ClipboardList },
  { label: "Vendors", path: "/pm/vendors", icon: Users },
  { label: "Units", path: "/pm/units", icon: Building2 },
];

const PMLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Proofline</h1>
        </div>
        <Badge variant="secondary" className="text-xs font-medium">Property Manager</Badge>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-10 border-t bg-background">
        <div className="flex max-w-5xl mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default PMLayout;
