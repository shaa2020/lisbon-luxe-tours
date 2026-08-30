import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Reset your ${siteName} password`}
    heading="Reset your password"
  >
    <Text style={authStyles.text}>
      We received a request to reset the password for your {siteName} account.
      Click the button below to choose a new password.
    </Text>
    <Button href={confirmationUrl} style={authStyles.button}>
      Set a new password
    </Button>
    <Text style={{ ...authStyles.text, marginTop: '24px' }}>
      If the button doesn't work, copy and paste this link into your browser:
    </Text>
    <Link href={confirmationUrl} style={authStyles.link}>
      {confirmationUrl}
    </Link>
    <Text style={authStyles.footer}>
      If you didn't request a password reset, you can safely ignore this email
      — your password will stay the same.
    </Text>
  </AuthLayout>
)
