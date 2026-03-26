import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const VoiceRulesSection = () => {
  const { t } = useI18n();

  const rules = [
    t("landing.voiceRule1"),
    t("landing.voiceRule2"),
    t("landing.voiceRule3"),
    t("landing.voiceRule4"),
  ];

  return (
    <section className="px-6 py-16">
      <motion.div
        className="max-w-md mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-bold text-foreground">{t("landing.voiceRulesTitle")}</h3>
        </motion.div>
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i + 1}
              className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10"
            >
              <span className="text-destructive text-sm mt-0.5">•</span>
              <span className="text-sm text-foreground">{rule}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default VoiceRulesSection;
