import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ONBOARDING_KEY } from "./OnboardingPage";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // If user is already logged in, go straight to chats
    if (user) {
      navigate("/chats", { replace: true });
      return;
    }

    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/landing", { replace: true });
    }
  }, [navigate, user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return null;
};

export default Index;
