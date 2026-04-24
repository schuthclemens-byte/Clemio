/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
  email?: string
  category?: string
  message?: string
  submissionId?: string
  ipAddress?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug-Report',
  feedback: '💡 Feedback',
  question: '❓ Frage',
  business: '💼 Geschäftliches',
  other: '📨 Sonstiges',
}

const ContactAdminEmail = ({ name, email, category, message, submissionId, ipAddress }: Props) => {
  const categoryLabel = category ? CATEGORY_LABELS[category] || category : 'Unbekannt'
  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>Neue Nachricht von {name || 'unbekannt'} via Clemio</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.logoWrap}>
            <span style={s.logoBadge}>Clemio Admin</span>
          </Section>
          <Section style={s.card}>
            <Heading style={s.h1}>Neue Kontaktanfrage</Heading>
            <Text style={s.text}>
              Jemand hat sich über das Kontaktformular auf clemio.app gemeldet.
            </Text>
            <Section style={s.infoBox}>
              <Text style={s.infoRow}><span style={s.infoLabel}>Name:</span> {name || '—'}</Text>
              <Text style={s.infoRow}><span style={s.infoLabel}>E-Mail:</span> {email || '—'}</Text>
              <Text style={s.infoRow}><span style={s.infoLabel}>Kategorie:</span> {categoryLabel}</Text>
              {ipAddress && (
                <Text style={s.infoRow}><span style={s.infoLabel}>IP:</span> {ipAddress}</Text>
              )}
              {submissionId && (
                <Text style={s.infoRow}><span style={s.infoLabel}>Submission-ID:</span> {submissionId}</Text>
              )}
            </Section>
            <Heading style={s.h2}>Nachricht</Heading>
            <Section style={s.infoBox}>
              <Text style={{ ...s.infoRow, whiteSpace: 'pre-wrap' as const }}>
                {message || '(Keine Nachricht)'}
              </Text>
            </Section>
            <Text style={s.textMuted}>
              💡 Klicke einfach auf "Antworten", um direkt zurückzuschreiben — die Antwort geht direkt an
              die Adresse oben.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContactAdminEmail,
  subject: (data) => `[Clemio] Kontaktformular: ${CATEGORY_LABELS[data.category as string] || 'Neue Nachricht'}`,
  to: 'clemensschuth@outlook.de',
  displayName: 'Kontakt: Admin-Benachrichtigung',
  previewData: {
    name: 'Max Mustermann',
    email: 'max@example.com',
    category: 'feedback',
    message: 'Ich liebe Clemio! Ein Vorschlag: Könnt ihr...',
    submissionId: 'abc-123',
    ipAddress: '203.0.113.42',
  },
} satisfies TemplateEntry
