import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Reset your ${siteName || 'Tuk Tuk 24'} password`}
    heading="Reset your password"
  >
    <Text style={authStyles.text}>
      We received a request to reset the password for your {siteName || 'Tuk Tuk 24'}{' '}
      account. Click below to choose a new one. This link expires shortly.
    </Text>
    <Button style={authStyles.button} href={confirmationUrl}>
      Set a new password
    </Button>
    <Text style={{ ...authStyles.text, margin: '22px 0 0', fontSize: '13px' }}>
      If the button doesn't work, copy and paste this link into your browser:
      <br />
      <span style={authStyles.link}>{confirmationUrl}</span>
    </Text>
    <Text style={authStyles.footer}>
      If you didn't request a reset, you can ignore this email — your password stays
      unchanged.
    </Text>
  </AuthLayout>
)

export default RecoveryEmail
