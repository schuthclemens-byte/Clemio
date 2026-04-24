/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
  deletedAt?: string
}

const AccountDeletedEmail = ({ name, deletedAt }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Clemio-Account wurde gelöscht</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoWrap}>
          <span style={s.logoBadge}>Clemio</span>
        </Section>
        <Section style={s.card}>
          <Heading style={s.h1}>{name ? `Tschüss ${name},` : 'Tschüss,'}</Heading>
          <Text style={s.text}>
            Dein Clemio-Account wurde erfolgreich gelöscht. Alle deine Daten — Nachrichten, Stimmprofil,
            Kontakte — wurden unwiderruflich entfernt.
          </Text>
          <Section style={s.infoBox}>
            <Text style={s.infoRow}>
              <span style={s.infoLabel}>✓ Entfernt:</span>
            </Text>
            <Text style={s.infoRow}>• Profil und Account-Daten</Text>
            <Text style={s.infoRow}>• Alle Nachrichten und Konversationen</Text>
            <Text style={s.infoRow}>• Stimmprofil und Sprachaufnahmen</Text>
            <Text style={s.infoRow}>• Kontakte und Einstellungen</Text>
          </Section>
          <Text style={s.text}>
            Falls du das nicht selbst veranlasst hast, melde dich bitte sofort bei{' '}
            <a href="mailto:clemensschuth@outlook.de" style={{ color: 'hsl(18, 90%, 55%)', fontWeight: 600 }}>
              clemensschuth@outlook.de
            </a>.
          </Text>
          <hr style={s.divider} />
          <Text style={s.textMuted}>
            Schade, dass du gehst. Falls dir etwas gefehlt hat oder du Feedback hast, schreib uns gerne —
            wir lesen jede Nachricht.
          </Text>
          {deletedAt && (
            <Text style={s.footer}>
              Gelöscht am {new Date(deletedAt).toLocaleString('de-DE')}
            </Text>
          )}
        </Section>
        <Text style={s.footer}>
          Clemio · Nachrichten, die klingen wie du
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountDeletedEmail,
  subject: 'Dein Clemio-Account wurde gelöscht',
  displayName: 'Account: Löschung bestätigt',
  previewData: { name: 'Max', deletedAt: new Date().toISOString() },
} satisfies TemplateEntry
