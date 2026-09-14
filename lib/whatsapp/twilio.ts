import twilio from 'twilio'

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  }
  return client
}

// phoneE164 should look like "+919876543210" (no "whatsapp:" prefix -- added here).
export async function sendWhatsAppMessage(phoneE164: string, body: string) {
  const from = process.env.TWILIO_WHATSAPP_NUMBER!
  const to = `whatsapp:${phoneE164}`

  try {
    await getClient().messages.create({ from, to, body })
  } catch (err) {
    // Don't let a WhatsApp delivery failure break the caller's flow (e.g. a
    // claim should still succeed even if the seller notification fails to send).
    console.error('Failed to send WhatsApp message', { to, error: err })
  }
}

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, params)
}

// Twilio media URLs require the account's own Basic Auth to fetch -- they are
// not publicly reachable otherwise.
export async function downloadTwilioMedia(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64')

  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) throw new Error(`Failed to download Twilio media: ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return { buffer, contentType }
}
