export interface InboundWhatsAppMessage {
  from: string // E.164, "whatsapp:" prefix stripped
  body: string
  mediaUrls: { url: string; contentType: string }[]
}

export function parseInboundMessage(params: URLSearchParams): InboundWhatsAppMessage {
  const from = (params.get('From') || '').replace('whatsapp:', '')
  const body = (params.get('Body') || '').trim()
  const numMedia = parseInt(params.get('NumMedia') || '0', 10)

  const mediaUrls: { url: string; contentType: string }[] = []
  for (let i = 0; i < numMedia; i++) {
    const url = params.get(`MediaUrl${i}`)
    const contentType = params.get(`MediaContentType${i}`)
    if (url) mediaUrls.push({ url, contentType: contentType || '' })
  }

  return { from, body, mediaUrls }
}
