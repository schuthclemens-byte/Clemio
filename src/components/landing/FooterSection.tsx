import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FooterSection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">Clemio</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap justify-center">
          <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">
            {t("landing.footerPrivacy")}
          </button>
          <span className="text-border">·</span>
          <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
            {t("landing.footerTerms")}
          </button>
          <span className="text-border">·</span>
          <button onClick={() => navigate("/impressum")} className="hover:text-foreground transition-colors">
            {t("landing.footerImprint")}
          </button>
        </div>
        <p className="text-[0.688rem] text-muted-foreground/50">
          © {new Date().getFullYear()} Clemio
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;
