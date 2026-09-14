// Where login codes are delivered. Supabase's Twilio provider can send the same phone OTP over
// SMS or WhatsApp; verification is identical either way (verifyOtp type 'sms').
//
// Production target is WhatsApp: Indian carriers filter non-DLT SMS from foreign numbers, so
// SMS codes don't reliably arrive. Flip NEXT_PUBLIC_OTP_CHANNEL=whatsapp once the Twilio
// Messaging Service has an approved WhatsApp Business sender (the Sandbox can't message users
// who haven't sent it a join code). NEXT_PUBLIC_ so client copy matches what the server sends.
export type OtpChannel = 'sms' | 'whatsapp'

export const OTP_CHANNEL: OtpChannel =
  process.env.NEXT_PUBLIC_OTP_CHANNEL === 'whatsapp' ? 'whatsapp' : 'sms'
