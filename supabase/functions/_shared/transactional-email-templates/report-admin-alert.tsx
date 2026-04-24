/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  reportId?: string
  reportType?: string
  reason?: string
  description?: string
  reportedBy?: string
  reportedUserId?: string
  messageId?: string
  createdAt?: string
}

const TYPE_LABELS: Record<string, string> = {
  message: '💬 Nachricht',
  voice: '🎤 Sprachnachricht',
  user: '👤 Nutzer',
}

const REASON_LABELS: Record<string, string> = {
  abuse: '⚠️ Missbrauch / Belästigung',
  wrong_voice: '🎭 Falsche Stimme',
  spam: '🚫 Spam',
  other: '❔ Sonstiges',
}

const ReportAdminAlertEmail = ({
  reportId, reportType, reason, description, reportedBy, reportedUserId, messageId, createdAt,
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Meldung in Clemio: {REASON_LABELS[reason || ''] || 'Unbekannt'}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoWrap}>
          <span style={s.logoBadge}>Clemio Admin</span>
        </Section>
        <Section style={s.card}>
          <Heading style={s.h1}>🚨 Neue Meldung eingegangen</Heading>
          <Text style={s.text}>
            Ein Nutzer hat etwas in Clemio gemeldet. Bitte prüfe den Vorgang im Admin-Dashboard.
          </Text>
          <Section style={s.infoBox}>
            <Text style={s.infoRow}>
              <span style={s.infoLabel}>Typ:</span> {TYPE_LABELS[reportType || ''] || reportType || '—'}
            </Text>
            <Text style={s.infoRow}>
              <span style={s.infoLabel}>Grund:</span> {REASON_LABELS[reason || ''] || reason || '—'}
            </Text>
            {description && (
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Beschreibung:</span> {description}
              </Text>
            )}
            {reportedBy && (
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Reporter-ID:</span> <code>{reportedBy}</code>
              </Text>
            )}
            {reportedUserId && (
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Gemeldete User-ID:</span> <code>{reportedUserId}</code>
              </Text>
            )}
            {messageId && (
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Nachricht-ID:</span> <code>{messageId}</code>
              </Text>
            )}
            {reportId && (
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Report-ID:</span> <code>{reportId}</code>
              </Text>
            )}
            {createdAt && (
              <Text style={s.infoRow}>
                <span style={s.infoLabel}>Eingegangen:</span> {new Date(createdAt).toLocaleString('de-DE')}
              </Text>
            )}
          </Section>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 12px' }}>
            <Button style={s.button} href="https://clemio.app/admin">
              Im Admin-Dashboard öffnen
            </Button>
          </Section>
          <Text style={s.textMuted}>
            🔒 Aus Datenschutzgründen werden hier nur IDs gezeigt. Vollständige User-Profile findest du
            im Admin-Dashboard.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReportAdminAlertEmail,
  subject: (data) => `[Clemio Report] ${REASON_LABELS[data.reason as string] || 'Neue Meldung'}`,
  to: 'clemensschuth@outlook.de',
  displayName: 'Report: Admin-Alert',
  previewData: {
    reportId: 'rep-abc-123',
    reportType: 'message',
    reason: 'spam',
    description: 'Sendet wiederholt unerwünschte Nachrichten',
    reportedBy: 'usr-aaa-111',
    reportedUserId: 'usr-bbb-222',
    messageId: 'msg-ccc-333',
    createdAt: new Date().toISOString(),
  },
} satisfies TemplateEntry
