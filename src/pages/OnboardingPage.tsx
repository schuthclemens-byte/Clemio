import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ONBOARDING_KEY = "clemix_onboarding_done";

const OnboardingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/landing", { replace: true });
  }, [navigate]);

  return null;
};

export { ONBOARDING_KEY };
export default OnboardingPage;
