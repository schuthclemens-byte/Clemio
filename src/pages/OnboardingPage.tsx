import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ear, Languages, Mic2, Shield, Headphones, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

const ONBOARDING_KEY = "clevara_onboarding_done";

const slideIcons = [
  <Ear className="w-10 h-10" />,
  <Mic2 className="w-10 h-10" />,
  <Languages className="w-10 h-10" />,
  <Headphones className="w-10 h-10" />,
  <Shield className="w-10 h-10" />,
];

const slideGradients = [
  "from-orange-400 to-rose-500",
  "from-rose-500 to-fuchsia-600",
  "from-fuchsia-500 to-violet-600",
  "from-violet-500 to-blue-600",
  "from-blue-500 to-cyan-500",
];

const OnboardingPage = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { t } = useI18n();
  const isLast = current === slideIcons.length - 1;

  const titleKeys = [
    "onboarding.slide1Title", "onboarding.slide2Title", "onboarding.slide3Title",
    "onboarding.slide4Title", "onboarding.slide5Title",
  ];
  const descKeys = [
    "onboarding.slide1Desc", "onboarding.slide2Desc", "onboarding.slide3Desc",
    "onboarding.slide4Desc", "onboarding.slide5Desc",
  ];

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/login", { replace: true });
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-5">
        <button
          onClick={finish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full"
        >
          {t("onboarding.skip")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Icon */}
        <div
          className={cn(
            "w-28 h-28 rounded-[2rem] flex items-center justify-center text-white mb-10 shadow-lg bg-gradient-to-br transition-all duration-500",
            slideGradients[current]
          )}
        >
          {slideIcons[current]}
        </div>

        {/* Text */}
        <h1
          key={`title-${current}`}
          className="text-2xl font-extrabold text-center tracking-tight mb-3 animate-reveal-up"
        >
          {t(titleKeys[current])}
        </h1>
        <p
          key={`desc-${current}`}
          className="text-muted-foreground text-center text-[0.938rem] leading-relaxed max-w-xs animate-reveal-up"
          style={{ animationDelay: "50ms" }}
        >
          {t(descKeys[current])}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-12">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slideIcons.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/20"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={next}
          className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-soft active:scale-[0.97] transition-transform"
        >
          {isLast ? t("onboarding.start") : t("onboarding.next")}
          <ArrowRight className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

export { ONBOARDING_KEY };
export default OnboardingPage;
