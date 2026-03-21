import { motion } from "framer-motion";
import { ShieldCheck, Lock, Heart, Eye } from "lucide-react";

const trustPoints = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Einwilligung first",
    text: "Stimmen werden nur mit ausdrücklicher Zustimmung verwendet – immer.",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Volle Kontrolle",
    text: "Du kannst deine Stimme jederzeit löschen. Ein Klick – fertig.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Transparent",
    text: "Wir verdienen nichts an deinen Daten. Punkt.",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Deine Daten, dein Ding",
    text: "Nichts wird geteilt, verkauft oder weitergegeben. Versprochen.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const TrustSection = () => (
  <section className="px-6 py-24">
    <motion.div
      className="max-w-lg mx-auto"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-bold uppercase tracking-wider text-center mb-3">
        Vertrauen
      </motion.p>
      <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold text-center mb-3 text-foreground leading-tight">
        Deine Stimme gehört dir
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-center text-base mb-12">
        Privatsphäre ist kein Feature – sondern unser Fundament.
      </motion.p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {trustPoints.map((tp, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={i + 3}
            whileHover={{ y: -3 }}
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              {tp.icon}
            </div>
            <h4 className="font-bold text-foreground text-sm mb-1">{tp.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{tp.text}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default TrustSection;
