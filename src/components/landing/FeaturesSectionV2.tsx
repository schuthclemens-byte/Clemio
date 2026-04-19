import { motion } from "framer-motion";
import { Mic, Sparkles, Headphones, Languages } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FeaturesSectionV2 = () => {
  const { t } = useI18n();

  const features = [
    { icon: Mic, titleKey: "landing.featV2VoiceTitle", descKey: "landing.featV2VoiceDesc", accent: "from-primary/20 to-primary/0" },
    { icon: Sparkles, titleKey: "landing.featV2AiTitle", descKey: "landing.featV2AiDesc", accent: "from-[hsl(45_95%_65%)]/25 to-transparent" },
    { icon: Headphones, titleKey: "landing.featV2AutoTitle", descKey: "landing.featV2AutoDesc", accent: "from-[hsl(340_75%_55%)]/20 to-transparent" },
    { icon: Languages, titleKey: "landing.featV2TransTitle", descKey: "landing.featV2TransDesc", accent: "from-[hsl(200_85%_55%)]/20 to-transparent" },
  ];

  return (
    <section className="relative px-6 py-32 sm:py-40 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20 sm:mb-28"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-4">{t("landing.featV2Eyebrow")}</p>
          <h2 className="text-3xl sm:text-5xl font-extralight tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
            {t("landing.featV2Title")}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.titleKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                className="group relative rounded-3xl p-8 lg:p-9 bg-card/40 backdrop-blur-xl border border-border/40 overflow-hidden transition-all duration-500 hover:border-border/80 hover:bg-card/60"
              >
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${f.accent} opacity-60 blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-border/40 flex items-center justify-center mb-7 transition-transform duration-500 group-hover:scale-110">
                    <Icon className="w-6 h-6 text-foreground/85" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg lg:text-xl font-light text-foreground mb-3 tracking-tight leading-snug">{t(f.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{t(f.descKey)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSectionV2;
