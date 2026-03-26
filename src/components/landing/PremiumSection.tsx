import { motion } from "framer-motion";
import { Mic2, Zap, Gauge, Sparkles } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const PremiumSection = () => {
  const { t } = useI18n();

  const features = [
    { icon: Mic2, text: t("landing.premFeat1") },
    { icon: Zap, text: t("landing.premFeat2") },
    { icon: Gauge, text: t("landing.premFeat3") },
    { icon: Sparkles, text: t("landing.premFeat4") },
  ];

  return (
    <section className="px-6 py-16">
      <motion.div
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="p-6 rounded-2xl bg-card border border-border shadow-elevated">
          <h3 className="text-xl font-extrabold text-foreground mb-4 text-center">
            {t("landing.premTitle")}
          </h3>

          <div className="space-y-3 mb-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center mb-3">
            <span className="text-2xl font-extrabold text-foreground">{t("landing.premPrice")}</span>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t("landing.premExtra")}
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default PremiumSection;
