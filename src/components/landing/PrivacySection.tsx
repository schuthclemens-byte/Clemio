import { motion } from "framer-motion";
import { Shield, Lock, EyeOff } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const PrivacySection = () => {
  const { t } = useI18n();

  const items = [
    { icon: Shield, titleKey: "landing.privGdprTitle", descKey: "landing.privGdprDesc" },
    { icon: Lock, titleKey: "landing.privSecTitle", descKey: "landing.privSecDesc" },
    { icon: EyeOff, titleKey: "landing.privNoShareTitle", descKey: "landing.privNoShareDesc" },
  ];

  return (
    <section className="relative px-6 py-32 sm:py-40 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-4">{t("landing.privEyebrow")}</p>
          <h2 className="text-3xl sm:text-5xl font-extralight tracking-tight text-foreground leading-tight max-w-2xl mx-auto">
            {t("landing.privTitle")}
          </h2>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground font-light max-w-lg mx-auto leading-relaxed">
            {t("landing.privSub")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-3xl bg-border/40 overflow-hidden border border-border/40">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                className="bg-background/80 backdrop-blur-xl p-8 sm:p-10 flex flex-col items-start gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-foreground/5 border border-border/40 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground/80" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg sm:text-xl font-light text-foreground tracking-tight">{t(it.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{t(it.descKey)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
