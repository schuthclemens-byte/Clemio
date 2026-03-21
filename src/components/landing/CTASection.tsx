import { useNavigate } from "react-router-dom";
import { Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg mx-auto relative rounded-3xl overflow-hidden"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-primary opacity-100" />
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(circle at 30% 50%, hsl(45 95% 70%), transparent 50%)" }}
          animate={{ x: [0, 50, 0], y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative p-10 text-center">
          <h2 className="text-3xl font-extrabold text-primary-foreground mb-3 leading-tight">
            Bereit, richtig<br />zuzuhören?
          </h2>
          <p className="text-primary-foreground/80 text-base mb-8 max-w-xs mx-auto">
            Installiere Hearo jetzt – kostenlos, in 10 Sekunden, direkt im Browser.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/install")}
              variant="secondary"
              size="lg"
              className="rounded-full px-8 gap-2.5 text-base font-bold h-14 shadow-elevated"
            >
              <Download className="w-5 h-5" />
              Jetzt installieren
            </Button>
            <button
              onClick={() => navigate("/login")}
              className="text-primary-foreground/70 hover:text-primary-foreground text-sm font-medium flex items-center gap-1 transition-colors"
            >
              Anmelden
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
