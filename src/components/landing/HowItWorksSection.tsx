import { motion } from "framer-motion";
import { MessageSquare, Mic2, Headphones } from "lucide-react";

const steps = [
  {
    icon: <MessageSquare className="w-7 h-7" />,
    number: "01",
    title: "Nachricht empfangen",
    description: "Du bekommst eine Nachricht – wie gewohnt. Text, Emoji, egal was.",
  },
  {
    icon: <Mic2 className="w-7 h-7" />,
    number: "02",
    title: "Stimme erkennen",
    description: "Hearo kennt die Stimme deines Kontakts und bereitet sie vor.",
  },
  {
    icon: <Headphones className="w-7 h-7" />,
    number: "03",
    title: "Zuhören & fühlen",
    description: "Tippe auf die Nachricht – und hör deinen Freund sprechen. Echt. Natürlich.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const HowItWorksSection = () => (
  <section className="px-6 py-24 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>

    <motion.div
      className="max-w-lg mx-auto"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-bold uppercase tracking-wider text-center mb-3">
        So funktioniert's
      </motion.p>
      <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold text-center mb-4 text-foreground leading-tight">
        Drei Schritte zum<br />echten Gespräch
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-center text-base mb-14 max-w-sm mx-auto">
        Keine Einrichtung, kein Aufwand. Einfach loslegen.
      </motion.p>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={i + 3}
            whileHover={{ x: 4 }}
            className="flex items-start gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 shadow-sm hover:shadow-elevated transition-all duration-300 group"
          >
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 transition-transform duration-300">
                {step.icon}
              </div>
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-[0.625rem] font-black flex items-center justify-center">
                {step.number}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default HowItWorksSection;
