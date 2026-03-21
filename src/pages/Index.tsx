import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ONBOARDING_KEY } from "./OnboardingPage";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/landing", { replace: true });
    }
  }, [navigate]);

  return null;
};

export default Index;
