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
    <section className="relative px-6 py-40 sm:py-56 overflow-hidden">
      {/* Soft trust-glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[60vh] rounded-full opacity-[0.18] blur-[140px]"
          style={{ background: "radial-gradient(circle, hsl(200 60% 55%) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center mb-24 sm:mb-32"
        >
          <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground/70 mb-6">
            {t("landing.privEyebrow")}
          </p>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-[-0.02em] text-foreground leading-[1.05] text-balance max-w-3xl mx-auto">
            {t("landing.privTitle")}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
                className="flex flex-col items-center text-center px-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] border border-border/50 flex items-center justify-center mb-7">
                  <Icon className="w-6 h-6 text-foreground/75" strokeWidth={1.4} />
                </div>
                <h3 className="text-lg sm:text-xl font-light text-foreground tracking-tight mb-3">
                  {t(it.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground/90 leading-relaxed font-light max-w-[18rem]">
                  {t(it.descKey)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
