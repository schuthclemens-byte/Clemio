import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const completeLogin = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          toast.error("Login-Link ist abgelaufen oder ungültig");
          navigate("/login", { replace: true });
          return;
        }

        navigate("/chats", { replace: true });
      } catch {
        toast.error("Login konnte nicht abgeschlossen werden");
        navigate("/login", { replace: true });
      }
    };

    void completeLogin();
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <section className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-normal">Clemio öffnet sich</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dein Login-Link wird sicher geprüft.
          </p>
        </div>
      </section>
    </main>
  );
};

export default AuthCallbackPage;