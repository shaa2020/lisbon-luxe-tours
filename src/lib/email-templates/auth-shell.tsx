import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/** Shared brand styling for all authentication emails (Tuk Tuk 24). */
export const authStyles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    margin: 0,
  },
  container: { maxWidth: '600px', margin: '0 auto', padding: '32px 20px 44px' },
  brandBar: {
    backgroundColor: '#1e3a5f',
    borderRadius: '8px 8px 0 0',
    padding: '22px 24px',
  },
  brandText: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  brandSub: {
    color: '#b9e7fb',
    fontSize: '11px',
    margin: '5px 0 0',
    letterSpacing: '1px',
  },
  content: {
    border: '1px solid #e2e8f0',
    borderTop: '0',
    borderRadius: '0 0 8px 8px',
    padding: '30px 24px',
  },
  h1: {
    color: '#1e3a5f',
    fontSize: '25px',
    lineHeight: '32px',
    margin: '0 0 16px',
  },
  text: { color: '#3c465a', fontSize: '15px', lineHeight: '24px', margin: '0 0 18px' },
  button: {
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
  },
  link: { color: '#1e3a5f', textDecoration: 'underline', wordBreak: 'break-all' as const },
  code: {
    backgroundColor: '#f5f7fa',
    borderLeft: '4px solid #2bb6f7',
    borderRadius: '6px',
    color: '#1e3a5f',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '6px',
    margin: '4px 0 22px',
    padding: '16px 18px',
  },
  footer: {
    color: '#8b95a5',
    fontSize: '12px',
    lineHeight: '19px',
    margin: '26px 0 0',
  },
}

export function AuthLayout({
  siteName,
  preview,
  heading,
  children,
}: {
  siteName?: string
  preview: string
  heading: string
  children: React.ReactNode
}) {
  const brand = siteName || 'Tuk Tuk 24'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={authStyles.main}>
        <Container style={authStyles.container}>
          <Section style={authStyles.brandBar}>
            <Text style={authStyles.brandText}>{brand}</Text>
            <Text style={authStyles.brandSub}>PRIVATE TUK TUK TOURS · LISBON</Text>
          </Section>
          <Section style={authStyles.content}>
            <Heading style={authStyles.h1}>{heading}</Heading>
            {children}
          </Section>
          <Text style={authStyles.footer}>
            {brand} · Lisbon, Portugal · This is an automated security email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
