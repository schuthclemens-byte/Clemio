import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const FooterSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  const productLinks = [
    { to: "/login", label: t("landing.footerLinkLogin") },
    { to: "/install", label: t("landing.footerLinkInstall") },
  ];

  const legalLinks = [
    { to: "/privacy", label: t("landing.footerPrivacy") },
    { to: "/terms", label: t("landing.footerTerms") },
    { to: "/impressum", label: t("landing.footerImprint") },
  ];

  return (
    <footer ref={ref} className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2 max-w-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-foreground tracking-tight">Clemio</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("landing.footerTagline")}
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground/80">
              <MapPin className="w-3.5 h-3.5 text-primary/70" strokeWidth={2} />
              <span>{t("landing.footerMadeIn")}</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] uppercase text-foreground/70 mb-4">
              {t("landing.footerColProduct")}
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:support@clemio.app"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" strokeWidth={2} />
                  {t("landing.footerContact")}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] uppercase text-foreground/70 mb-4">
              {t("landing.footerColLegal")}
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/70">
          <p>© {new Date().getFullYear()} Clemio. {t("landing.footerRights")}</p>
          <p className="text-[0.688rem]">{t("landing.footerHonest")}</p>
        </div>
      </div>
    </footer>
  );
});

FooterSection.displayName = "FooterSection";

export default FooterSection;
