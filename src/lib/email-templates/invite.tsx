import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { AuthLayout, authStyles } from './auth-shell'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <AuthLayout
    siteName={siteName}
    preview={`You've been invited to the ${siteName || 'Tuk Tuk 24'} team`}
    heading="You've been invited"
  >
    <Text style={authStyles.text}>
      You've been added to the {siteName || 'Tuk Tuk 24'} admin team. Use the button
      below to accept your invitation and choose your password — it only takes a
      moment.
    </Text>
    <Button style={authStyles.button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={{ ...authStyles.text, margin: '22px 0 0', fontSize: '13px' }}>
      If the button doesn't work, copy and paste this link into your browser:
      <br />
      <span style={authStyles.link}>{confirmationUrl}</span>
    </Text>
    <Text style={authStyles.footer}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </AuthLayout>
)

export default InviteEmail
