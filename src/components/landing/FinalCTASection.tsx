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
        className="relative max-w-4xl mx-auto text-center"
      >
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-[-0.02em] leading-[1.05] text-balance text-foreground">
          {t("landing.finalCtaTitle")}
        </h2>
        <div className="mt-16 sm:mt-20 flex items-center justify-center">
          <button
            onClick={() => navigate("/login")}
            className="group relative inline-flex items-center gap-3 px-12 py-6 rounded-full bg-foreground text-background font-medium text-base sm:text-lg tracking-tight shadow-[0_15px_50px_-12px_hsl(var(--foreground)/0.45)] transition-all duration-500 hover:shadow-[0_25px_70px_-10px_hsl(var(--primary)/0.55)] hover:scale-[1.04] active:scale-[0.97] overflow-hidden"
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(340 75% 55%) 100%)" }}
            />
            <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-500">
              {t("landing.ctaTryApp")}
            </span>
            <ArrowRight
              className="w-5 h-5 relative z-10 transition-all duration-500 group-hover:translate-x-1 group-hover:text-primary-foreground"
              strokeWidth={2}
            />
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default FinalCTASection;
