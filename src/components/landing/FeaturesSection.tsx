import { motion } from "framer-motion";
import { Ear, Languages, Mic2, Shield, Headphones } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const FeaturesSection = () => {
  const { t } = useI18n();

  const features = [
    { icon: <Ear className="w-6 h-6" />, title: t("landing.feat1Title"), description: t("landing.feat1Desc"), gradient: "from-amber-400 to-orange-500" },
    { icon: <Mic2 className="w-6 h-6" />, title: t("landing.feat2Title"), description: t("landing.feat2Desc"), gradient: "from-orange-500 to-rose-500" },
    { icon: <Languages className="w-6 h-6" />, title: t("landing.feat3Title"), description: t("landing.feat3Desc"), gradient: "from-rose-500 to-fuchsia-500" },
    { icon: <Headphones className="w-6 h-6" />, title: t("landing.feat4Title"), description: t("landing.feat4Desc"), gradient: "from-fuchsia-500 to-violet-500" },
    { icon: <Shield className="w-6 h-6" />, title: t("landing.feat5Title"), description: t("landing.feat5Desc"), gradient: "from-violet-500 to-blue-500" },
  ];

  return (
    <section className="px-6 py-24 bg-secondary/30">
      <motion.div
        className="max-w-lg mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-bold uppercase tracking-wider text-center mb-3">
          {t("landing.featuresLabel")}
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold text-center mb-3 text-foreground leading-tight">
          {t("landing.featuresTitle")}
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-center text-base mb-14">
          {t("landing.featuresSubtitle")}
        </motion.p>

        <div className="space-y-3">
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i + 3}
              whileHover={{ scale: 1.01, y: -2 }}
              className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-elevated transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shrink-0`}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default FeaturesSection;
