import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Smartphone, Monitor, Download } from "lucide-react";
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
            Melde dich an und starte sofort – im Browser, als App oder auf dem Desktop.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/login")}
              variant="secondary"
              size="lg"
              className="rounded-full px-8 gap-2.5 text-base font-bold h-14 shadow-elevated"
            >
              <LogIn className="w-5 h-5" />
              Anmelden
            </Button>

            <div className="flex items-center gap-2 mt-2">
              {apkUrl && (
                <a
                  href={apkUrl}
                  download="hearo.apk"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground font-semibold text-sm transition-colors active:scale-95 border border-primary-foreground/20"
                >
                  <Smartphone className="w-4 h-4" />
                  Android
                </a>
              )}
              <button
                onClick={() => navigate("/install")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground font-semibold text-sm transition-colors active:scale-95 border border-primary-foreground/20"
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
