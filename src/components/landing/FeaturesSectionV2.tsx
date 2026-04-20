import { motion } from "framer-motion";
import { Mic, Sparkles, Headphones, Languages } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FeaturesSectionV2 = () => {
  const { t } = useI18n();

  // Sekundäre Vorteile (Trio unter der Hero-Karte)
  const secondary = [
    {
      icon: Sparkles,
      titleKey: "landing.featV2AiTitle",
      descKey: "landing.featV2AiDesc",
      accent: "from-[hsl(45_95%_65%)]/25 to-transparent",
    },
    {
      icon: Headphones,
      titleKey: "landing.featV2AutoTitle",
      descKey: "landing.featV2AutoDesc",
      accent: "from-[hsl(340_75%_55%)]/20 to-transparent",
    },
    {
      icon: Languages,
      titleKey: "landing.featV2TransTitle",
      descKey: "landing.featV2TransDesc",
      accent: "from-[hsl(200_85%_55%)]/20 to-transparent",
    },
  ];

  return (
    <section className="relative px-6 py-24 sm:py-32 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Eyebrow + Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 sm:mb-20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-4">
            {t("landing.featV2Eyebrow")}
          </p>
          <h2 className="text-3xl sm:text-5xl font-extralight tracking-tight text-foreground max-w-3xl mx-auto leading-tight text-balance">
            {t("landing.featV2Title")}
          </h2>
        </motion.div>

        {/* Hero-Karte: Stimme statt Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="group relative rounded-[2rem] p-8 sm:p-12 lg:p-14 bg-card/50 backdrop-blur-xl border border-border/50 overflow-hidden mb-6 lg:mb-8 transition-all duration-500 hover:border-border/80 hover:bg-card/70"
        >
          {/* Sanfter Glow-Akzent */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent opacity-70 blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute -bottom-32 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-[hsl(340_75%_55%)]/15 to-transparent opacity-60 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-14 items-center">
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-foreground/[0.04] border border-border/50 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <Mic className="w-9 h-9 sm:w-11 sm:h-11 text-foreground/85" strokeWidth={1.4} />
              </div>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-primary/80 font-light mb-3">
                {t("landing.featV2HeroLabel")}
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-light text-foreground tracking-tight leading-tight mb-4">
                {t("landing.featV2VoiceTitle")}
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-light max-w-xl">
                {t("landing.featV2VoiceDesc")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Sekundärkarten: Trio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          {secondary.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.titleKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: "easeOut" }}
                className="group relative rounded-3xl p-7 lg:p-8 bg-card/40 backdrop-blur-xl border border-border/40 overflow-hidden transition-all duration-500 hover:border-border/80 hover:bg-card/60"
              >
                <div
                  className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${f.accent} opacity-60 blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100`}
                />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-border/40 flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110">
                    <Icon className="w-5 h-5 text-foreground/85" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base lg:text-lg font-light text-foreground mb-2.5 tracking-tight leading-snug">
                    {t(f.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    {t(f.descKey)}
                  </p>
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
