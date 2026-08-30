import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface EmailChangeEmailProps {
  siteName: string
  email?: string
  oldEmail?: string
  newEmail?: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Confirm your new email address for ${siteName}`}
    heading="Confirm your email change"
  >
    <Text style={authStyles.text}>
      You requested to change the email address on your {siteName} account
      {oldEmail || email ? (
        <>
          {' '}
          from <strong>{oldEmail ?? email}</strong>
        </>
      ) : null}
      {newEmail ? (
        <>
          {' '}
          to <strong>{newEmail}</strong>
        </>
      ) : null}
      . Click the button below to confirm this change.
    </Text>
    <Button href={confirmationUrl} style={authStyles.button}>
      Confirm email change
    </Button>
    <Text style={{ ...authStyles.text, marginTop: '24px' }}>
      If the button doesn't work, copy and paste this link into your browser:
    </Text>
    <Link href={confirmationUrl} style={authStyles.link}>
      {confirmationUrl}
    </Link>
    <Text style={authStyles.footer}>
      If you didn't request this change, contact us immediately — your account
      may be at risk.
    </Text>
  </AuthLayout>
)
