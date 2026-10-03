import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, History, Settings, LogOut } from "lucide-react";
import ChimeLogo from "@/components/ChimeLogo";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link to="/upload" className="flex items-center gap-2 font-semibold">
          <ChimeLogo size={24} />
          <span className="text-lg font-bold tracking-tight text-foreground">Chime</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant={isActive("/upload") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/upload")}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <Upload className="h-4 w-4 text-primary" />
            <span>Upload</span>
          </Button>

          <Button
            variant={isActive("/analytics") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/analytics")}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>Analytics</span>
          </Button>

          <Button
            variant={isActive("/history") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/history")}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <History className="h-4 w-4 text-primary" />
            <span>History</span>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant={isActive("/settings") ? "secondary" : "ghost"}
            size="icon"
            onClick={() => navigate("/settings")}
            title="Account Settings"
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout();
              navigate("/");
            }}
            title="Log Out"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
