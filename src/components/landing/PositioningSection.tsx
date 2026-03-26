import { motion } from "framer-motion";
import { Headphones } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const PositioningSection = () => {
  const { t } = useI18n();

  return (
    <section className="px-6 py-16">
      <motion.div
        className="max-w-md mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-soft">
          <Headphones className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mb-2">
          {t("landing.posLine1")}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {t("landing.posLine2")}
        </p>
      </motion.div>
    </section>
  );
};

export default PositioningSection;
