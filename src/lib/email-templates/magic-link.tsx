import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Your ${siteName} sign-in link`}
    heading="Your sign-in link"
  >
    <Text style={authStyles.text}>
      Click the button below to securely sign in to your {siteName} account.
      This link only works once and expires shortly.
    </Text>
    <Button href={confirmationUrl} style={authStyles.button}>
      Sign in to {siteName}
    </Button>
    <Text style={{ ...authStyles.text, marginTop: '24px' }}>
      If the button doesn't work, copy and paste this link into your browser:
    </Text>
    <Link href={confirmationUrl} style={authStyles.link}>
      {confirmationUrl}
    </Link>
    <Text style={authStyles.footer}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </AuthLayout>
)
