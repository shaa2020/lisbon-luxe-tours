import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthLayout preview="Your verification code" heading="Confirm it's you">
    <Text style={authStyles.text}>Use this code to confirm your identity:</Text>
    <Text style={authStyles.code}>{token}</Text>
    <Text style={authStyles.footer}>
      This code expires shortly. If you didn't request it, you can safely ignore this
      email.
    </Text>
  </AuthLayout>
)

export default ReauthenticationEmail
