import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, FileText } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const Section = ({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) => (
  <section
    className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <h3 className="font-semibold text-[0.938rem] mb-3">{title}</h3>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
  </section>
);

const Bullet = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <li className="flex gap-2">
    <span className={accent ? "text-accent" : "text-primary"}>•</span>
    <span>{children}</span>
  </li>
);

const Forbidden = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2">
    <span className="text-destructive">✗</span>
    <span>{children}</span>
  </li>
);

const TermsPage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/settings");
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background" {...swipeHandlers}>
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("legal.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("legal.termsTitle")}</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("legal.termsFullTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("legal.termsUpdated")}</p>
            </div>
          </div>
        </section>

        {/* 1 */}
        <Section title={t("legal.terms1Title")} delay={0}>
          <p>{t("legal.terms1Text")}</p>
          <p>{t("legal.terms1Operator")}</p>
        </Section>

        {/* 2 */}
        <Section title={t("legal.terms2Title")} delay={60}>
          <p>{t("legal.terms2Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms2B1")}</Bullet>
            <Bullet>{t("legal.terms2B2")}</Bullet>
            <Bullet>{t("legal.terms2B3")}</Bullet>
            <Bullet>{t("legal.terms2B4")}</Bullet>
            <Bullet>{t("legal.terms2B5")}</Bullet>
            <Bullet>{t("legal.terms2B6")}</Bullet>
            <Bullet>{t("legal.terms2B7")}</Bullet>
            <Bullet>{t("legal.terms2B8")}</Bullet>
          </ul>
          <p>{t("legal.terms2Age")}</p>
        </Section>

        {/* 3 */}
        <Section title={t("legal.terms3Title")} delay={120}>
          <p>{t("legal.terms3Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms3B1")}</Bullet>
            <Bullet>{t("legal.terms3B2")}</Bullet>
            <Bullet>{t("legal.terms3B3")}</Bullet>
          </ul>
          <p>{t("legal.terms3Note")}</p>
        </Section>

        {/* 4 */}
        <Section title={t("legal.terms4Title")} delay={180}>
          <p>{t("legal.terms4Text")}</p>
          <ul className="space-y-1">
            <Bullet accent>{t("legal.terms4B1")}</Bullet>
            <Bullet accent>{t("legal.terms4B2")}</Bullet>
            <Bullet accent>{t("legal.terms4B3")}</Bullet>
          </ul>
          <p className="font-medium text-foreground">{t("legal.terms4ConsentTitle")}</p>
          <p>{t("legal.terms4ConsentText")}</p>
          <p>{t("legal.terms4ContactVoice")}</p>
        </Section>

        {/* 5 */}
        <Section title={t("legal.terms5Title")} delay={220}>
          <p>{t("legal.terms5Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms5B1")}</Bullet>
            <Bullet>{t("legal.terms5B2")}</Bullet>
            <Bullet>{t("legal.terms5B3")}</Bullet>
            <Bullet>{t("legal.terms5B4")}</Bullet>
          </ul>
        </Section>

        {/* 6 */}
        <Section title={t("legal.terms6Title")} delay={260}>
          <p>{t("legal.terms6Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms6B1")}</Bullet>
            <Bullet>{t("legal.terms6B2")}</Bullet>
            <Bullet>{t("legal.terms6B3")}</Bullet>
            <Bullet>{t("legal.terms6B4")}</Bullet>
          </ul>
          <p>{t("legal.terms6Note")}</p>
        </Section>

        {/* 7 */}
        <Section title={t("legal.terms7Title")} delay={300}>
          <p>{t("legal.terms7Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms7B1")}</Bullet>
            <Bullet>{t("legal.terms7B2")}</Bullet>
            <Bullet>{t("legal.terms7B3")}</Bullet>
            <Bullet>{t("legal.terms7B4")}</Bullet>
          </ul>
          <p>{t("legal.terms7Note")}</p>
        </Section>

        {/* 8 */}
        <Section title={t("legal.terms8Title")} delay={360}>
          <p>{t("legal.terms8Text")}</p>
          <ul className="space-y-2">
            <Forbidden>{t("legal.terms8F1")}</Forbidden>
            <Forbidden>{t("legal.terms8F2")}</Forbidden>
            <Forbidden>{t("legal.terms8F3")}</Forbidden>
            <Forbidden>{t("legal.terms8F4")}</Forbidden>
            <Forbidden>{t("legal.terms8F5")}</Forbidden>
            <Forbidden>{t("legal.terms8F6")}</Forbidden>
          </ul>
          <p>{t("legal.terms8Warn")}</p>
        </Section>

        {/* 9 */}
        <Section title={t("legal.terms9Title")} delay={420}>
          <p>{t("legal.terms9Text")}</p>
          <p>{t("legal.terms9Encryption")}</p>
        </Section>

        {/* 10 */}
        <Section title={t("legal.terms10Title")} delay={480}>
          <p>{t("legal.terms10Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms10B1")}</Bullet>
            <Bullet>{t("legal.terms10B2")}</Bullet>
            <Bullet>{t("legal.terms10B3")}</Bullet>
            <Bullet>{t("legal.terms10B4")}</Bullet>
            <Bullet>{t("legal.terms10B5")}</Bullet>
          </ul>
          <p className="font-medium text-foreground">{t("legal.terms10Warn")}</p>
        </Section>

        {/* 11 */}
        <Section title={t("legal.terms11Title")} delay={540}>
          <p>{t("legal.terms11Text")}</p>
          <p>{t("legal.terms11LiabilityText")}</p>
          <ul className="space-y-1">
            <Bullet>{t("legal.terms11B1")}</Bullet>
            <Bullet>{t("legal.terms11B2")}</Bullet>
            <Bullet>{t("legal.terms11B3")}</Bullet>
            <Bullet>{t("legal.terms11B4")}</Bullet>
          </ul>
        </Section>

        {/* 12 */}
        <Section title={t("legal.terms12Title")} delay={600}>
          <p>{t("legal.terms12Text")}</p>
        </Section>

        {/* 13 */}
        <Section title={t("legal.terms13Title")} delay={660}>
          <p>{t("legal.terms13Text")}</p>
        </Section>

        {/* Contact */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "720ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("legal.termsContactTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("legal.termsContactText")}{" "}
            <a href="mailto:support@clemio.app" className="text-primary font-medium hover:underline">
              support@clemio.app
            </a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default TermsPage;
