import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`You've been invited to join ${siteName}`}
    heading="You've been invited"
  >
    <Text style={authStyles.text}>
      You've been invited to join the{' '}
      <Link href={siteUrl} style={authStyles.link}>
        <strong>{siteName}</strong>
      </Link>{' '}
      team. Click the button below to accept the invitation and set up your
      account.
    </Text>
    <Button href={confirmationUrl} style={authStyles.button}>
      Accept invitation
    </Button>
    <Text style={{ ...authStyles.text, marginTop: '24px' }}>
      If the button doesn't work, copy and paste this link into your browser:
    </Text>
    <Link href={confirmationUrl} style={authStyles.link}>
      {confirmationUrl}
    </Link>
    <Text style={authStyles.footer}>
      This invitation link expires soon. If you weren't expecting it, you can
      ignore this email.
    </Text>
  </AuthLayout>
)
