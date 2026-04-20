import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Clock, Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FinalCTASection = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const microTrust = [
    { icon: Clock, label: t("landing.finalCtaTrust1") },
    { icon: ShieldCheck, label: t("landing.finalCtaTrust2") },
    { icon: Trash2, label: t("landing.finalCtaTrust3") },
  ];

  return (
    <section className="relative px-6 py-28 sm:py-40 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] sm:w-[80vw] h-[80vh] rounded-full opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(340 75% 55% / 0.4) 40%, transparent 70%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <span className="inline-block text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">
          {t("landing.finalCtaEyebrow")}
        </span>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-[-0.02em] leading-[1.08] text-balance text-foreground">
          {t("landing.finalCtaHeadline")}
        </h2>

        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t("landing.finalCtaSub")}
        </p>

        <div className="mt-10 sm:mt-12 flex items-center justify-center">
          <button
            onClick={() => navigate("/login")}
            className="group relative inline-flex items-center gap-3 px-10 py-5 sm:px-12 sm:py-6 rounded-full bg-foreground text-background font-medium text-base sm:text-lg tracking-tight shadow-[0_15px_50px_-12px_hsl(var(--foreground)/0.45)] transition-all duration-500 hover:shadow-[0_25px_70px_-10px_hsl(var(--primary)/0.55)] hover:scale-[1.04] active:scale-[0.97] overflow-hidden"
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(340 75% 55%) 100%)" }}
            />
            <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-500">
              {t("landing.finalCtaPrimary")}
            </span>
            <ArrowRight
              className="w-5 h-5 relative z-10 transition-all duration-500 group-hover:translate-x-1 group-hover:text-primary-foreground"
              strokeWidth={2}
            />
          </button>
        </div>


        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground">
          {microTrust.map((item, i) => (
            <li key={i} className="inline-flex items-center gap-2">
              <item.icon className="w-3.5 h-3.5 text-primary/80 shrink-0" strokeWidth={2} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
};

export default FinalCTASection;
