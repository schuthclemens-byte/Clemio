import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FooterSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  return (
    <footer ref={ref} className="border-t border-border px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-5 text-center">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base text-foreground">Clemio</span>
        </div>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {t("landing.footerTagline")}
        </p>

        {/* Legal links */}
        <nav
          aria-label={t("landing.footerLegalAria")}
          className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap justify-center pt-1"
        >
          <Link
            to="/privacy"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t("landing.footerPrivacy")}
          </Link>
          <span className="text-border" aria-hidden>·</span>
          <Link
            to="/terms"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t("landing.footerTerms")}
          </Link>
          <span className="text-border" aria-hidden>·</span>
          <Link
            to="/impressum"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t("landing.footerImprint")}
          </Link>
          <span className="text-border" aria-hidden>·</span>
          <a
            href="mailto:support@clemio.app"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t("landing.footerContact")}
          </a>
        </nav>

        {/* Copyright */}
        <p className="text-[0.688rem] text-muted-foreground/60 pt-1">
          © {new Date().getFullYear()} Clemio · {t("landing.footerMadeIn")}
        </p>
      </div>
    </footer>
  );
});

FooterSection.displayName = "FooterSection";

export default FooterSection;
