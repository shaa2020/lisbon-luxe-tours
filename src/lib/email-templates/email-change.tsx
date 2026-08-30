import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Confirm your new email for ${siteName || 'Tuk Tuk 24'}`}
    heading="Confirm your email change"
  >
    <Text style={authStyles.text}>
      You asked to change the email address on your {siteName || 'Tuk Tuk 24'} account
      from {oldEmail} to {newEmail}.
    </Text>
    <Button style={authStyles.button} href={confirmationUrl}>
      Confirm change
    </Button>
    <Text style={{ ...authStyles.text, margin: '22px 0 0', fontSize: '13px' }}>
      If the button doesn't work, copy and paste this link into your browser:
      <br />
      <span style={authStyles.link}>{confirmationUrl}</span>
    </Text>
    <Text style={authStyles.footer}>
      If you didn't request this change, please secure your account immediately.
    </Text>
  </AuthLayout>
)

export default EmailChangeEmail
