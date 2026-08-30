import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: SignupEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Confirm your email for ${siteName}`}
    heading="Confirm your email"
  >
    <Text style={authStyles.text}>
      Thanks for creating an account with{' '}
      <Link href={siteUrl} style={authStyles.link}>
        <strong>{siteName}</strong>
      </Link>
      . Click the button below to confirm your email address and get started.
    </Text>
    <Button href={confirmationUrl} style={authStyles.button}>
      Confirm email address
    </Button>
    <Text style={{ ...authStyles.text, marginTop: '24px' }}>
      If the button doesn't work, copy and paste this link into your browser:
    </Text>
    <Link href={confirmationUrl} style={authStyles.link}>
      {confirmationUrl}
    </Link>
    <Text style={authStyles.footer}>
      If you didn't create an account, you can safely ignore this email.
    </Text>
  </AuthLayout>
)
