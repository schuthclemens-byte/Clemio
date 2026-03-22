import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const CTASection = () => {
  const navigate = useNavigate();
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.storage.from("downloads").getPublicUrl("hearo.apk");
    if (data?.publicUrl) {
      fetch(data.publicUrl, { method: "HEAD" }).then(r => {
        if (r.ok) setApkUrl(data.publicUrl);
      }).catch(() => {});
    }
  }, []);

  return (
    <section className="px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-lg mx-auto relative rounded-3xl overflow-hidden"
      >
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
          <p className="text-primary-foreground/80 text-base mb-8 max-w-sm mx-auto">
            Nutze Hearo direkt auf der Website – ganz ohne Download. Wenn du möchtest, kannst du die Android-App zusätzlich optional herunterladen.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/login")}
              variant="secondary"
              size="lg"
              className="rounded-full px-8 gap-2.5 text-base font-bold h-14 shadow-elevated"
            >
              <ArrowRight className="w-5 h-5" />
              Direkt im Browser starten
            </Button>
            {apkUrl && (
              <a
                href={apkUrl}
                download="hearo.apk"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground font-semibold text-sm transition-colors active:scale-95 border border-primary-foreground/20"
              >
                <Smartphone className="w-4 h-4" />
                Android-App optional herunterladen
              </a>
            )}
            <button
              onClick={() => navigate("/install")}
              className="text-primary-foreground/70 hover:text-primary-foreground text-sm font-medium flex items-center gap-1 transition-colors"
            >
              Installations-Hilfe
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
