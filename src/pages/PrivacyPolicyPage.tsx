import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Shield } from "lucide-react";
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

const PrivacyPolicyPage = () => {
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
          <h1 className="text-xl font-bold">{t("privacy.title")}</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("privacy.headerTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("privacy.headerUpdated")}</p>
            </div>
          </div>
        </section>

        {/* 1. Verantwortlicher */}
        <Section title={t("privacy.s1Title")} delay={0}>
          <p>{t("privacy.s1Text")}</p>
          <p className="whitespace-pre-line">{t("privacy.s1Contact")}</p>
        </Section>

        {/* 2. Übersicht */}
        <Section title={t("privacy.s2Title")} delay={60}>
          <p>{t("privacy.s2Text")}</p>
          <p className="font-medium text-foreground">{t("privacy.s2NoTracking")}</p>
        </Section>

        {/* 3. Kontodaten */}
        <Section title={t("privacy.s3Title")} delay={120}>
          <p>{t("privacy.s3Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s3B1")}</Bullet>
            <Bullet>{t("privacy.s3B2")}</Bullet>
            <Bullet>{t("privacy.s3B3")}</Bullet>
            <Bullet>{t("privacy.s3B4")}</Bullet>
            <Bullet>{t("privacy.s3B5")}</Bullet>
            <Bullet>{t("privacy.s3B6")}</Bullet>
          </ul>
          <p><strong>{t("privacy.s3Legal")}</strong></p>
        </Section>

        {/* 4. Nachrichten */}
        <Section title={t("privacy.s4Title")} delay={180}>
          <p>{t("privacy.s4Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s4B1")}</Bullet>
            <Bullet>{t("privacy.s4B2")}</Bullet>
            <Bullet>{t("privacy.s4B3")}</Bullet>
            <Bullet>{t("privacy.s4B4")}</Bullet>
            <Bullet>{t("privacy.s4B5")}</Bullet>
            <Bullet>{t("privacy.s4B6")}</Bullet>
          </ul>
          <p>{t("privacy.s4Storage")}</p>
          <p><strong>{t("privacy.s4Legal")}</strong></p>
        </Section>

        {/* 5. Kontaktverwaltung */}
        <Section title={t("privacy.s5Title")} delay={220}>
          <p>{t("privacy.s5Text")}</p>
          <ul className="space-y-1">
            <Bullet><strong>{t("privacy.s5B1Lbl")}</strong> {t("privacy.s5B1")}</Bullet>
            <Bullet><strong>{t("privacy.s5B2Lbl")}</strong> {t("privacy.s5B2")}</Bullet>
            <Bullet><strong>{t("privacy.s5B3Lbl")}</strong> {t("privacy.s5B3")}</Bullet>
            <Bullet><strong>{t("privacy.s5B4Lbl")}</strong> {t("privacy.s5B4")}</Bullet>
          </ul>
          <p>{t("privacy.s5Private")}</p>
          <p><strong>{t("privacy.s5Legal")}</strong></p>
        </Section>

        {/* 6. Anrufe */}
        <Section title={t("privacy.s6Title")} delay={260}>
          <p>{t("privacy.s6Text")}</p>
          <p className="font-medium text-foreground">{t("privacy.s6DataTitle")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s6B1")}</Bullet>
            <Bullet>{t("privacy.s6B2")}</Bullet>
            <Bullet>{t("privacy.s6B3")}</Bullet>
            <Bullet>{t("privacy.s6B4")}</Bullet>
          </ul>
          <p className="font-medium text-foreground mt-2">{t("privacy.s6ExternalTitle")}</p>

          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>{t("privacy.s6StunTitle")}</strong></p>
            <p>{t("privacy.s6StunAddr")}</p>
            <p>{t("privacy.s6StunPurpose")}</p>
            <p>{t("privacy.s6StunData")}</p>
            <p>{t("privacy.s6StunProvider")}</p>
            <p>
              <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a>
            </p>
          </div>

          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>{t("privacy.s6TurnTitle")}</strong></p>
            <p>{t("privacy.s6TurnAddr")}</p>
            <p>{t("privacy.s6TurnPurpose")}</p>
            <p>{t("privacy.s6TurnData")}</p>
            <p>{t("privacy.s6TurnProvider")}</p>
            <p>
              <a href="https://www.metered.ca/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">metered.ca/privacy</a>
            </p>
          </div>

          <p><strong>{t("privacy.s6Legal")}</strong></p>
        </Section>

        {/* 7. Online-Status */}
        <Section title={t("privacy.s7Title")} delay={300}>
          <p>{t("privacy.s7Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s7B1")}</Bullet>
            <Bullet>{t("privacy.s7B2")}</Bullet>
            <Bullet>{t("privacy.s7B3")}</Bullet>
          </ul>
          <p>{t("privacy.s7Visibility")}</p>
          <p><strong>{t("privacy.s7Legal")}</strong></p>
        </Section>

        {/* 8. Push */}
        <Section title={t("privacy.s8Title")} delay={340}>
          <p>{t("privacy.s8Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s8B1")}</Bullet>
            <Bullet>{t("privacy.s8B2")}</Bullet>
          </ul>
          <p>{t("privacy.s8Preview")}</p>
          <p>{t("privacy.s8Delivery")}</p>
          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>{t("privacy.s8Fcm")}</strong></p>
            <p>{t("privacy.s8FcmProvider")}</p>
            <p>
              <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a>
            </p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
            <p><strong>{t("privacy.s8Apns")}</strong></p>
            <p>{t("privacy.s8ApnsProvider")}</p>
            <p>
              <a href="https://www.apple.com/legal/privacy/" className="text-primary hover:underline" target="_blank" rel="noopener">apple.com/legal/privacy</a>
            </p>
          </div>
          <p>{t("privacy.s8Encryption")}</p>
          <p><strong>{t("privacy.s8Legal")}</strong></p>
        </Section>

        {/* 9. Backend */}
        <Section title={t("privacy.s9Title")} delay={380}>
          <p>{t("privacy.s9Text")}</p>
          <ul className="space-y-1">
            <Bullet><strong>{t("privacy.s9B1Lbl")}</strong> {t("privacy.s9B1")}</Bullet>
            <Bullet><strong>{t("privacy.s9B2Lbl")}</strong> {t("privacy.s9B2")}</Bullet>
            <Bullet><strong>{t("privacy.s9B3Lbl")}</strong> {t("privacy.s9B3")}</Bullet>
            <Bullet><strong>{t("privacy.s9B4Lbl")}</strong> {t("privacy.s9B4")}</Bullet>
            <Bullet><strong>{t("privacy.s9B5Lbl")}</strong> {t("privacy.s9B5")}</Bullet>
          </ul>
          <p>
            {t("privacy.s9Provider")}<br />
            <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">supabase.com/privacy</a>
          </p>
          <p><strong>{t("privacy.s9Legal")}</strong></p>
        </Section>

        {/* 10. Hosting */}
        <Section title={t("privacy.s10Title")} delay={420}>
          <p>{t("privacy.s10Text")}</p>
          <p>{t("privacy.s10DataTitle")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s10B1")}</Bullet>
            <Bullet>{t("privacy.s10B2")}</Bullet>
            <Bullet>{t("privacy.s10B3")}</Bullet>
            <Bullet>{t("privacy.s10B4")}</Bullet>
          </ul>
          <p>
            {t("privacy.s10Provider")}<br />
            <a href="https://lovable.dev/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">lovable.dev/privacy</a>
          </p>
          <p><strong>{t("privacy.s10Legal")}</strong></p>
        </Section>

        {/* 11. ElevenLabs */}
        <section
          className="bg-card rounded-2xl shadow-sm border-2 border-primary/30 animate-reveal-up overflow-hidden"
          style={{ animationDelay: "460ms" }}
        >
          <div className="bg-primary/10 px-5 py-3 flex items-center gap-2">
            <span className="text-lg">🎤</span>
            <h3 className="font-semibold text-[0.938rem]">{t("privacy.s11Title")}</h3>
          </div>
          <div className="p-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="font-medium text-foreground">⚠️ {t("privacy.s11Warning")}</p>
            </div>
            <p>{t("privacy.s11Text")}</p>
            <p className="font-medium text-foreground">{t("privacy.s11DataTitle")}</p>
            <ul className="space-y-1">
              <Bullet>{t("privacy.s11B1")}</Bullet>
              <Bullet>{t("privacy.s11B2")}</Bullet>
              <Bullet>{t("privacy.s11B3")}</Bullet>
              <Bullet>{t("privacy.s11B4")}</Bullet>
            </ul>
            <p className="font-medium text-foreground">{t("privacy.s11ProcessTitle")}</p>
            <ul className="space-y-1">
              <Bullet>{t("privacy.s11P1")}</Bullet>
              <Bullet>{t("privacy.s11P2")}</Bullet>
            </ul>
            <p className="font-medium text-foreground">{t("privacy.s11ConsentTitle")}</p>
            <p>{t("privacy.s11ConsentText")}</p>
            <p className="font-medium text-foreground">{t("privacy.s11ConsentDataTitle")}</p>
            <ul className="space-y-1">
              <Bullet>{t("privacy.s11C1")}</Bullet>
              <Bullet>{t("privacy.s11C2")}</Bullet>
              <Bullet>{t("privacy.s11C3")}</Bullet>
            </ul>
            <p className="font-medium text-foreground">{t("privacy.s11DeleteTitle")}</p>
            <p>{t("privacy.s11DeleteText")}</p>
            <p>
              {t("privacy.s11Provider")}<br />
              <a href="https://elevenlabs.io/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">elevenlabs.io/privacy</a>
            </p>
            <p><strong>{t("privacy.s11Legal")}</strong></p>
          </div>
        </section>

        {/* 12. Stripe */}
        <Section title={t("privacy.s12Title")} delay={500}>
          <p>{t("privacy.s12Text")}</p>
          <p className="font-medium text-foreground">{t("privacy.s12DataTitle")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s12B1")}</Bullet>
            <Bullet>{t("privacy.s12B2")}</Bullet>
            <Bullet>{t("privacy.s12B3")}</Bullet>
          </ul>
          <p>
            {t("privacy.s12Provider")}<br />
            <a href="https://stripe.com/de/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">stripe.com/privacy</a>
          </p>
          <p><strong>{t("privacy.s12Legal")}</strong></p>
        </Section>

        {/* 13. KI-Übersetzung */}
        <Section title={t("privacy.s13Title")} delay={540}>
          <p>{t("privacy.s13Text")}</p>
          <p className="font-medium text-foreground">{t("privacy.s13DataTitle")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s13B1")}</Bullet>
            <Bullet>{t("privacy.s13B2")}</Bullet>
          </ul>
          <p>{t("privacy.s13Gateway")}</p>
          <p>
            {t("privacy.s13Model")}<br />
            <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a>
          </p>
          <p><strong>{t("privacy.s13Legal")}</strong></p>
        </Section>

        {/* 14. Clemix-KI */}
        <Section title={t("privacy.s14Title")} delay={560}>
          <p>{t("privacy.s14Text")}</p>
          <p className="font-medium text-foreground">{t("privacy.s14DataTitle")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s14B1")}</Bullet>
            <Bullet>{t("privacy.s14B2")}</Bullet>
            <Bullet>{t("privacy.s14B3")}</Bullet>
            <Bullet>{t("privacy.s14B4")}</Bullet>
          </ul>
          <p className="font-medium text-foreground">{t("privacy.s14LimitTitle")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s14L1")}</Bullet>
            <Bullet>{t("privacy.s14L2")}</Bullet>
            <Bullet>{t("privacy.s14L3")}</Bullet>
          </ul>
          <p className="font-medium text-foreground">{t("privacy.s14SovereigntyTitle")}</p>
          <p>{t("privacy.s14SovereigntyText")}</p>
          <p>{t("privacy.s14Gateway")}</p>
          <p>
            {t("privacy.s14Model")}<br />
            <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">policies.google.com/privacy</a>
          </p>
          <p><strong>{t("privacy.s14Legal")}</strong></p>
        </Section>

        {/* 15. Privatsphäre */}
        <Section title={t("privacy.s15Title")} delay={600}>
          <p>{t("privacy.s15Text")}</p>
          <ul className="space-y-1">
            <Bullet><strong>{t("privacy.s15B1Lbl")}</strong> {t("privacy.s15B1")}</Bullet>
            <Bullet><strong>{t("privacy.s15B2Lbl")}</strong> {t("privacy.s15B2")}</Bullet>
            <Bullet><strong>{t("privacy.s15B3Lbl")}</strong> {t("privacy.s15B3")}</Bullet>
            <Bullet><strong>{t("privacy.s15B4Lbl")}</strong> {t("privacy.s15B4")}</Bullet>
            <Bullet><strong>{t("privacy.s15B5Lbl")}</strong> {t("privacy.s15B5")}</Bullet>
          </ul>
          <p>{t("privacy.s15Storage")}</p>
          <p><strong>{t("privacy.s15Legal")}</strong></p>
        </Section>

        {/* 16. Offline */}
        <Section title={t("privacy.s16Title")} delay={640}>
          <p>{t("privacy.s16Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s16B1")}</Bullet>
            <Bullet>{t("privacy.s16B2")}</Bullet>
            <Bullet>{t("privacy.s16B3")}</Bullet>
          </ul>
          <p>{t("privacy.s16Local")}</p>
          <p><strong>{t("privacy.s16Legal")}</strong></p>
        </Section>

        {/* 17. Drittstaaten */}
        <Section title={t("privacy.s17Title")} delay={680}>
          <p>{t("privacy.s17Text")}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-medium text-foreground">{t("privacy.s17ColService")}</th>
                  <th className="text-left py-2 pr-3 font-medium text-foreground">{t("privacy.s17ColCountry")}</th>
                  <th className="text-left py-2 font-medium text-foreground">{t("privacy.s17ColBasis")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr><td className="py-2 pr-3">Supabase</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">Google (STUN, FCM, Gemini)</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">Apple (APNs)</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">ElevenLabs</td><td className="py-2 pr-3">USA</td><td className="py-2">{t("privacy.s17ConsentScc")}</td></tr>
                <tr><td className="py-2 pr-3">Stripe</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
                <tr><td className="py-2 pr-3">Metered.ca</td><td className="py-2 pr-3">{t("privacy.s17AdequacyDecision") === "Angemessenheitsbeschluss" ? "Kanada" : "Canada"}</td><td className="py-2">{t("privacy.s17AdequacyDecision")}</td></tr>
                <tr><td className="py-2 pr-3">Lovable AI Gateway ({t("privacy.s17TranslationOnly")})</td><td className="py-2 pr-3">{t("privacy.s17WithinEu") === "Innerhalb EU/EWR" ? "Schweden (EU)" : "Sweden (EU)"}</td><td className="py-2">{t("privacy.s17WithinEu")}</td></tr>
                <tr><td className="py-2 pr-3">Google Gemini (Clemix-KI)</td><td className="py-2 pr-3">USA</td><td className="py-2">EU-US Data Privacy Framework</td></tr>
              </tbody>
            </table>
          </div>
          <p>{t("privacy.s17Adequacy")}</p>
        </Section>

        {/* 18. Rechtsgrundlagen */}
        <Section title={t("privacy.s18Title")} delay={720}>
          <ul className="space-y-2">
            <Bullet accent><strong>{t("privacy.s18Consent")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s18Contract")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s18Interest")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s18Biometric")}</strong></Bullet>
          </ul>
        </Section>

        {/* 19. Speicherdauer */}
        <Section title={t("privacy.s19Title")} delay={760}>
          <ul className="space-y-2">
            <Bullet><strong>{t("privacy.s19B1Lbl")}</strong> {t("privacy.s19B1")}</Bullet>
            <Bullet><strong>{t("privacy.s19B2Lbl")}</strong> {t("privacy.s19B2")}</Bullet>
            <Bullet><strong>{t("privacy.s19B3Lbl")}</strong> {t("privacy.s19B3")}</Bullet>
            <Bullet><strong>{t("privacy.s19B4Lbl")}</strong> {t("privacy.s19B4")}</Bullet>
            <Bullet><strong>{t("privacy.s19B5Lbl")}</strong> {t("privacy.s19B5")}</Bullet>
            <Bullet><strong>{t("privacy.s19B6Lbl")}</strong> {t("privacy.s19B6")}</Bullet>
            <Bullet><strong>{t("privacy.s19B7Lbl")}</strong> {t("privacy.s19B7")}</Bullet>
            <Bullet><strong>{t("privacy.s19B8Lbl")}</strong> {t("privacy.s19B8")}</Bullet>
            <Bullet><strong>{t("privacy.s19B9Lbl")}</strong> {t("privacy.s19B9")}</Bullet>
          </ul>
          <p>{t("privacy.s19Deletion")}</p>
        </Section>

        {/* 20. Rechte */}
        <Section title={t("privacy.s20Title")} delay={800}>
          <p>{t("privacy.s20Text")}</p>
          <ul className="space-y-1">
            <Bullet accent><strong>{t("privacy.s20R1")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s20R2")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s20R3")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s20R4")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s20R5")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s20R6")}</strong></Bullet>
            <Bullet accent><strong>{t("privacy.s20R7")}</strong></Bullet>
          </ul>
          <p>{t("privacy.s20Authority")}</p>
        </Section>

        {/* 21. Sicherheit */}
        <Section title={t("privacy.s21Title")} delay={840}>
          <p>{t("privacy.s21Text")}</p>
          <ul className="space-y-1">
            <Bullet>{t("privacy.s21B1")}</Bullet>
            <Bullet>{t("privacy.s21B2")}</Bullet>
            <Bullet>{t("privacy.s21B3")}</Bullet>
            <Bullet>{t("privacy.s21B4")}</Bullet>
            <Bullet>{t("privacy.s21B5")}</Bullet>
            <Bullet>{t("privacy.s21B6")}</Bullet>
            <Bullet>{t("privacy.s21B7")}</Bullet>
          </ul>
          <p>{t("privacy.s21Disclaimer")}</p>
        </Section>

        {/* 22. Mindestalter */}
        <Section title={t("privacy.s22Title")} delay={880}>
          <p>{t("privacy.s22Text")}</p>
        </Section>

        {/* Lösch-Hinweis */}
        <section className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 animate-reveal-up" style={{ animationDelay: "900ms" }}>
          <p className="text-sm text-foreground leading-relaxed">
            🗑️ <strong>{t("privacy.deleteTitle")}</strong> {t("privacy.deleteText")}
          </p>
        </section>

        {/* Kontakt */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "940ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">{t("privacy.contactTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("privacy.contactText")}{" "}
            <a href="mailto:privacy@clemio.app" className="text-primary font-medium hover:underline">
              privacy@clemio.app
            </a>
          </p>
        </section>

        {/* Trust */}
        <section className="animate-reveal-up" style={{ animationDelay: "980ms" }}>
          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-foreground">{t("privacy.trustBadge")}</p>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
