/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
  plan?: string
  premiumUntil?: string
}

const PremiumActivatedEmail = ({ name, plan, premiumUntil }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Willkommen bei Clemio Premium 👑</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoWrap}>
          <span style={s.logoBadge}>Clemio Premium</span>
        </Section>
        <Section style={s.card}>
          <Heading style={s.h1}>{name ? `${name}, willkommen bei Premium! 👑` : 'Willkommen bei Premium! 👑'}</Heading>
          <Text style={s.text}>
            Vielen Dank, dass du Clemio unterstützt. Ab sofort hast du Zugriff auf alle Premium-Features:
          </Text>
          <Section style={s.infoBox}>
            <Text style={s.infoRow}>🎤 <strong>Eigenes Stimm-Profil</strong> — deine Nachrichten in deiner echten Stimme</Text>
            <Text style={s.infoRow}>🌍 <strong>Echtzeit-Übersetzung</strong> — auch in der Stimme des Senders</Text>
            <Text style={s.infoRow}>▶️ <strong>Erweiterter Auto-Play</strong> — alle Kontakte automatisch abspielen</Text>
            <Text style={s.infoRow}>🤖 <strong>Unbegrenzte Clemio-KI</strong> — Nachrichten verbessern ohne Limit</Text>
          </Section>
          {(plan || premiumUntil) && (
            <Section style={s.infoBox}>
              {plan && (
                <Text style={s.infoRow}>
                  <span style={s.infoLabel}>Plan:</span> {plan}
                </Text>
              )}
              {premiumUntil && (
                <Text style={s.infoRow}>
                  <span style={s.infoLabel}>Aktiv bis:</span>{' '}
                  {new Date(premiumUntil).toLocaleDateString('de-DE')}
                </Text>
              )}
            </Section>
          )}
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 12px' }}>
            <Button style={s.button} href="https://clemio.app/chats">
              Jetzt loslegen
            </Button>
          </Section>
          <hr style={s.divider} />
          <Text style={s.textMuted}>
            Du kannst dein Abonnement jederzeit in den Einstellungen verwalten. Bei Fragen melde dich gerne
            unter support@clemio.app.
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
  component: PremiumActivatedEmail,
  subject: '👑 Willkommen bei Clemio Premium',
  displayName: 'Premium: Aktiviert',
  previewData: { name: 'Max', plan: 'Premium Monatlich', premiumUntil: new Date(Date.now() + 30 * 86400_000).toISOString() },
} satisfies TemplateEntry
