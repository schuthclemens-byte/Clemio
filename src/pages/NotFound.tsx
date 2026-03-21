import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-extrabold text-primary">404</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Seite nicht gefunden</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Die Seite, die du suchst, existiert leider nicht oder wurde verschoben.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
        >
          <Home className="w-4 h-4" />
          Zur Startseite
        </button>
      </div>
    </div>
  );
};

export default NotFound;
