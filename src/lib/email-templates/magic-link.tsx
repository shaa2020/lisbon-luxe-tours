import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Your sign-in link for ${siteName || 'Tuk Tuk 24'}`}
    heading="Your sign-in link"
  >
    <Text style={authStyles.text}>
      Click below to sign in to {siteName || 'Tuk Tuk 24'}. This link expires shortly
      and can only be used once.
    </Text>
    <Button style={authStyles.button} href={confirmationUrl}>
      Sign in
    </Button>
    <Text style={{ ...authStyles.text, margin: '22px 0 0', fontSize: '13px' }}>
      If the button doesn't work, copy and paste this link into your browser:
      <br />
      <span style={authStyles.link}>{confirmationUrl}</span>
    </Text>
    <Text style={authStyles.footer}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </AuthLayout>
)

export default MagicLinkEmail
