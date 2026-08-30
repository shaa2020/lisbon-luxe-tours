import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Confirm your email for ${siteName || 'Tuk Tuk 24'}`}
    heading="Confirm your email"
  >
    <Text style={authStyles.text}>
      Thanks for creating an account with {siteName || 'Tuk Tuk 24'}. Please confirm
      that {recipient} is your email address.
    </Text>
    <Button style={authStyles.button} href={confirmationUrl}>
      Confirm email
    </Button>
    <Text style={{ ...authStyles.text, margin: '22px 0 0', fontSize: '13px' }}>
      If the button doesn't work, copy and paste this link into your browser:
      <br />
      <span style={authStyles.link}>{confirmationUrl}</span>
    </Text>
    <Text style={authStyles.footer}>
      If you didn't create this account, you can safely ignore this email.
    </Text>
  </AuthLayout>
)

export default SignupEmail
