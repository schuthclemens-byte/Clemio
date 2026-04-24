/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
  premiumUntil?: string
}

const PremiumCancelledEmail = ({ name, premiumUntil }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Clemio Premium-Abo wurde gekündigt</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoWrap}>
          <span style={s.logoBadge}>Clemio</span>
        </Section>
        <Section style={s.card}>
          <Heading style={s.h1}>{name ? `Hi ${name},` : 'Hi,'}</Heading>
          <Text style={s.text}>
            Schade, dass du gehst — wir haben dein Premium-Abonnement wie gewünscht gekündigt. ✓
          </Text>
          {premiumUntil && (
            <Section style={s.infoBox}>
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Premium aktiv bis:</span>{' '}
                {new Date(premiumUntil).toLocaleDateString('de-DE')}
              </Text>
              <Text style={s.infoRow}>
                Bis dahin kannst du alle Premium-Features weiterhin nutzen.
              </Text>
            </Section>
          )}
          <Heading style={s.h2}>Was passiert danach?</Heading>
          <Text style={s.text}>
            • Dein Account bleibt erhalten — alle deine Nachrichten und Kontakte sind weiterhin da.<br />
            • Premium-Features (Stimm-Klon, Übersetzung, KI-Boost) werden deaktiviert.<br />
            • Dein Stimmprofil bleibt gespeichert und wird wieder aktiv, falls du erneut abschließt.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 12px' }}>
            <Button style={s.button} href="https://clemio.app/settings">
              Wieder Premium werden
            </Button>
          </Section>
          <hr style={s.divider} />
          <Text style={s.textMuted}>
            Falls dir etwas gefehlt hat: Schreib uns! Dein Feedback hilft uns, Clemio besser zu machen.
          </Text>
        </Section>
        <Text style={s.footer}>
          Clemio · Nachrichten, die klingen wie du
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PremiumCancelledEmail,
  subject: 'Dein Clemio Premium-Abo wurde gekündigt',
  displayName: 'Premium: Gekündigt',
  previewData: { name: 'Max', premiumUntil: new Date(Date.now() + 15 * 86400_000).toISOString() },
} satisfies TemplateEntry
