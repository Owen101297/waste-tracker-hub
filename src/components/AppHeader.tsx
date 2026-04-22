import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Leaf, LogOut } from "lucide-react";

export function AppHeader() {
  const { signOut, role, user } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };
  return (
    <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold leading-none">EcoResiduos</div>
            <div className="text-xs text-muted-foreground">{role === "admin" ? "Panel administrador" : "Panel cliente"}</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Salir
          </Button>
        </div>
      </div>
    </header>
  );
}