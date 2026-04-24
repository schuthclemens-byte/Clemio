/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
  changedAt?: string
}

const PasswordChangedEmail = ({ name, changedAt }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Clemio-Passwort wurde geändert</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoWrap}>
          <span style={s.logoBadge}>Clemio</span>
        </Section>
        <Section style={s.card}>
          <Heading style={s.h1}>{name ? `Hi ${name},` : 'Hi,'}</Heading>
          <Text style={s.text}>
            Dein Clemio-Passwort wurde erfolgreich geändert. ✅
          </Text>
          {changedAt && (
            <Section style={s.infoBox}>
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Geändert am:</span>{' '}
                {new Date(changedAt).toLocaleString('de-DE')}
              </Text>
            </Section>
          )}
          <Heading style={s.h2}>Warst du das nicht?</Heading>
          <Text style={s.text}>
            Falls du dein Passwort nicht selbst geändert hast, ist möglicherweise jemand in deinen Account
            eingedrungen. Setze sofort ein neues Passwort und kontaktiere uns:
          </Text>
          <Text style={s.text}>
            👉 <a href="mailto:clemensschuth@outlook.de" style={{ color: 'hsl(18, 90%, 55%)', fontWeight: 600 }}>
              clemensschuth@outlook.de
            </a>
          </Text>
          <hr style={s.divider} />
          <Text style={s.textMuted}>
            💡 Tipp: Verwende ein einzigartiges Passwort für Clemio und aktiviere — falls verfügbar — die
            biometrische Anmeldung in den Einstellungen.
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
  component: PasswordChangedEmail,
  subject: '🔒 Dein Clemio-Passwort wurde geändert',
  displayName: 'Sicherheit: Passwort geändert',
  previewData: { name: 'Max', changedAt: new Date().toISOString() },
} satisfies TemplateEntry
