import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface BookingNoticeProps {
  brandName?: string
  heading?: string
  intro?: string
  outro?: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  rows?: { label: string; value: string }[]
  previewText?: string
  contactEmail?: string
  contactPhone?: string
  addressLine?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 20px 44px' }
const brandBar = {
  backgroundColor: '#1e3a5f',
  borderRadius: '8px 8px 0 0',
  padding: '22px 24px',
}
const brandText = { color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0 }
const brandSub = { color: '#b9e7fb', fontSize: '11px', margin: '5px 0 0', letterSpacing: '1px' }
const content = { border: '1px solid #e2e8f0', borderTop: '0', borderRadius: '0 0 8px 8px', padding: '30px 24px' }
const h1 = { color: '#1e3a5f', fontSize: '25px', lineHeight: '32px', margin: '0 0 16px' }
const p = { color: '#3c465a', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const small = { color: '#6e7887', fontSize: '12px', lineHeight: '19px', margin: '0 0 6px' }
const card = {
  backgroundColor: '#f5f7fa',
  borderLeft: '4px solid #2bb6f7',
  borderRadius: '6px',
  padding: '8px 18px',
  margin: '6px 0 24px',
}
const rowLabel = { color: '#6e7887', fontSize: '11px', letterSpacing: '1px', margin: '14px 0 2px' }
const rowValue = { color: '#1e3a5f', fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }
const btn = {
  backgroundColor: '#2bb6f7',
  color: '#ffffff',
  borderRadius: '999px',
  display: 'inline-block',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1px',
  padding: '13px 28px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
}

const BookingNotice = ({
  brandName = 'Tuk Tuk 24',
  heading = 'Your booking',
  intro = '',
  outro = '',
  ctaLabel,
  ctaUrl,
  rows = [],
  previewText,
  contactEmail,
  contactPhone,
  addressLine,
}: BookingNoticeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{previewText || heading}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Row>
            <Column>
              <Text style={brandText}>{brandName}</Text>
              <Text style={brandSub}>PRIVATE TUK-TUK TOURS · LISBON</Text>
            </Column>
            <Column align="right">
              <Text style={{ color: '#ffffff', fontSize: '12px', margin: 0 }}>Local team · Electric fleet</Text>
            </Column>
          </Row>
        </Section>
        <Section style={content}>
          <Heading style={h1}>{heading}</Heading>
        {intro
          ? intro.split('\n\n').map((block, i) => (
              <Text key={i} style={p}>
                {block}
              </Text>
            ))
          : null}

        {rows.length > 0 ? (
          <Section style={card}>
            {rows.map((r) => (
              <React.Fragment key={r.label + r.value}>
                <Text style={rowLabel}>{r.label.toUpperCase()}</Text>
                <Text style={rowValue}>{r.value}</Text>
              </React.Fragment>
            ))}
          </Section>
        ) : null}

        {ctaLabel && ctaUrl ? (
          <Section style={{ margin: '0 0 24px' }}>
            <Link href={ctaUrl} style={btn}>
              {ctaLabel}
            </Link>
          </Section>
        ) : null}

        {outro
          ? outro.split('\n\n').map((block, i) => (
              <Text key={i} style={p}>
                {block}
              </Text>
            ))
          : null}

          <Hr style={{ borderColor: '#e2e6ec', margin: '26px 0 16px' }} />
          <Text style={{ ...small, color: '#1e3a5f', fontWeight: 700 }}>{brandName}</Text>
          {addressLine ? <Text style={small}>{addressLine}</Text> : null}
        {contactEmail || contactPhone ? (
          <Text style={small}>
            {[contactEmail, contactPhone].filter(Boolean).join(' · ')}
          </Text>
          ) : null}
          <Text style={{ ...small, marginTop: '10px' }}>Reply to this email if you need help with your booking.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingNotice,
  subject: (data: Record<string, any>) =>
    (data['subject'] as string) || 'A message about your booking',
  displayName: 'Booking notice',
  previewData: {
    brandName: 'Tuk Tuk 24',
    heading: 'Your tour is confirmed',
    intro: 'Hi Maria, thanks for booking with us. Here are your tour details.',
    outro: 'Free cancellation up to 24 hours before the tour.',
    ctaLabel: 'Manage my booking',
    ctaUrl: 'https://tuktuk24lisbon.com/booking/manage',
    rows: [
      { label: 'Booking reference', value: 'A1B2C3D4' },
      { label: 'Tour', value: 'Alfama & Old Lisbon · 2h' },
      { label: 'Date', value: 'Friday, 12 September 2026' },
      { label: 'Guests', value: '3' },
      { label: 'Total', value: '€120.00' },
    ],
  },
} satisfies TemplateEntry

export default BookingNotice
