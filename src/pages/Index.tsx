import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ONBOARDING_KEY } from "./OnboardingPage";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    navigate(done ? "/login" : "/onboarding", { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
