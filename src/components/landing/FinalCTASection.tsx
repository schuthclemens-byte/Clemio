import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FinalCTASection = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <section className="relative px-6 py-32 sm:py-44 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] sm:w-[80vw] h-[80vh] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(340 75% 55% / 0.4) 40%, transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.45, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-tight leading-[1.05] text-balance text-foreground">
          {t("landing.finalCtaTitle")}
        </h2>
        <p className="mt-6 sm:mt-8 text-base sm:text-lg text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
          {t("landing.finalCtaSub")}
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="group inline-flex items-center gap-2.5 px-9 py-4 rounded-full bg-foreground text-background font-medium text-base shadow-elevated transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
          >
            {t("landing.finalCtaPrimary")}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate("/install")}
            className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-card/40 backdrop-blur-xl border border-border/40 text-foreground/90 font-light text-base transition-all duration-300 hover:bg-card/60 hover:border-border/80"
          >
            {t("landing.finalCtaSecondary")}
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default FinalCTASection;
