/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
}

const VoiceCloneCreatedEmail = ({ name }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Deine Stimme ist bereit auf Clemio 🎤</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoWrap}>
          <span style={s.logoBadge}>Clemio</span>
        </Section>
        <Section style={s.card}>
          <Heading style={s.h1}>{name ? `${name}, deine Stimme ist da! 🎤` : 'Deine Stimme ist da! 🎤'}</Heading>
          <Text style={s.text}>
            Wir haben dein Stimmprofil erfolgreich erstellt. Ab jetzt können deine Kontakte deine Nachrichten
            in <strong>deiner echten Stimme</strong> hören.
          </Text>
          <Section style={s.infoBox}>
            <Text style={s.infoRow}>
              <span style={s.infoLabel}>🔒 Wichtig zum Datenschutz:</span>
            </Text>
            <Text style={s.infoRow}>• Nur Kontakte mit deiner Freigabe können deine Stimme hören</Text>
            <Text style={s.infoRow}>• Du kannst die Freigabe jederzeit widerrufen</Text>
            <Text style={s.infoRow}>• Du kannst dein Stimmprofil jederzeit löschen</Text>
          </Section>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 12px' }}>
            <Button style={s.button} href="https://clemio.app/voice/recordings">
              Stimmprofil verwalten
            </Button>
          </Section>
          <Text style={s.textMuted}>
            Falls du das nicht selbst angestoßen hast, lösche bitte sofort dein Stimmprofil in der App und
            melde dich bei uns.
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
  component: VoiceCloneCreatedEmail,
  subject: '🎤 Deine Stimme ist bereit auf Clemio',
  displayName: 'Voice: Stimmprofil erstellt',
  previewData: { name: 'Max' },
} satisfies TemplateEntry
