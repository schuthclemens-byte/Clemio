/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import * as s from './_styles.ts'

interface Props {
  name?: string
  category?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug-Report',
  feedback: 'Feedback',
  question: 'Frage',
  business: 'Geschäftliches',
  other: 'Sonstiges',
}

const ContactConfirmationEmail = ({ name, category }: Props) => {
  const greeting = name ? `Hi ${name}!` : 'Hi!'
  const categoryLabel = category ? CATEGORY_LABELS[category] || 'Anliegen' : 'Anliegen'

  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>Wir haben deine Nachricht bei Clemio erhalten</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.logoWrap}>
            <span style={s.logoBadge}>Clemio</span>
          </Section>
          <Section style={s.card}>
            <Heading style={s.h1}>{greeting}</Heading>
            <Text style={s.text}>
              Danke, dass du dich bei Clemio gemeldet hast. Wir haben dein {categoryLabel} erhalten und
              kümmern uns drum.
            </Text>
            <Text style={s.text}>
              Üblicherweise antworten wir innerhalb von <strong>48 Stunden</strong>. Bei dringenden Fällen
              kann es schneller gehen — bei detaillierten Anfragen auch mal etwas länger.
            </Text>
            <Text style={s.textMuted}>
              Solltest du in der Zwischenzeit zusätzliche Infos haben, antworte einfach direkt auf diese
              E-Mail. Wir lesen alles.
            </Text>
            <Text style={s.footer}>
              Liebe Grüße<br />
              Clemens & das Clemio-Team
            </Text>
          </Section>
          <Text style={s.footer}>
            Clemio · Nachrichten, die klingen wie du
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContactConfirmationEmail,
  subject: 'Wir haben deine Nachricht erhalten',
  displayName: 'Kontakt: Bestätigung an User',
  previewData: { name: 'Max', category: 'feedback' },
} satisfies TemplateEntry
