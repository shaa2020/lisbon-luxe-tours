import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface ReauthenticationEmailProps {
  siteName: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName,
  token,
}: ReauthenticationEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`Your ${siteName} verification code`}
    heading="Your verification code"
  >
    <Text style={authStyles.text}>
      Use the code below to confirm it's really you. This code expires
      shortly, so enter it as soon as possible.
    </Text>
    <Text style={authStyles.code}>{token}</Text>
    <Text style={authStyles.footer}>
      If you didn't request this code, you can safely ignore this email.
      Never share this code with anyone.
    </Text>
  </AuthLayout>
)
