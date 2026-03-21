import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ear, Languages, Mic2, Shield, Headphones, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "hearo_onboarding_done";

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    icon: <Ear className="w-10 h-10" />,
    title: "Nachrichten hören",
    description: "Lass dir Nachrichten vorlesen – in der echten Stimme deiner Kontakte.",
    gradient: "from-orange-400 to-rose-500",
  },
  {
    icon: <Mic2 className="w-10 h-10" />,
    title: "Stimme klonen",
    description: "Nimm deine Stimme auf und deine Freunde hören dich – nicht einen Roboter.",
    gradient: "from-rose-500 to-fuchsia-600",
  },
  {
    icon: <Languages className="w-10 h-10" />,
    title: "Echtzeit-Übersetzung",
    description: "Nachrichten werden automatisch in deine Sprache übersetzt.",
    gradient: "from-fuchsia-500 to-violet-600",
  },
  {
    icon: <Headphones className="w-10 h-10" />,
    title: "Kopfhörer-Modus",
    description: "Verbinde Kopfhörer und Nachrichten werden automatisch abgespielt.",
    gradient: "from-violet-500 to-blue-600",
  },
  {
    icon: <Shield className="w-10 h-10" />,
    title: "Fokus-Modus",
    description: "Nur wichtige Kontakte werden vorgelesen. Keine Ablenkung.",
    gradient: "from-blue-500 to-cyan-500",
  },
];

const OnboardingPage = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const slide = slides[current];
  const isLast = current === slides.length - 1;

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
          Überspringen
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Icon */}
        <div
          className={cn(
            "w-28 h-28 rounded-[2rem] flex items-center justify-center text-white mb-10 shadow-lg bg-gradient-to-br transition-all duration-500",
            slide.gradient
          )}
        >
          {slide.icon}
        </div>

        {/* Text */}
        <h1
          key={`title-${current}`}
          className="text-2xl font-extrabold text-center tracking-tight mb-3 animate-reveal-up"
        >
          {slide.title}
        </h1>
        <p
          key={`desc-${current}`}
          className="text-muted-foreground text-center text-[0.938rem] leading-relaxed max-w-xs animate-reveal-up"
          style={{ animationDelay: "50ms" }}
        >
          {slide.description}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-12">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
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
          {isLast ? "Los geht's" : "Weiter"}
          <ArrowRight className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

export { ONBOARDING_KEY };
export default OnboardingPage;
