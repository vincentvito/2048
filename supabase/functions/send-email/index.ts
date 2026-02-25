const resendApiKey = Deno.env.get('RESEND_API_KEY') as string
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string
const supabaseUrl = (Deno.env.get('SUPABASE_URL') as string).replace(/\/$/, '')

async function verifyWebhook(payload: string, headers: Record<string, string>): Promise<Record<string, unknown>> {
  const msgId = headers['webhook-id']
  const timestamp = headers['webhook-timestamp']
  const signature = headers['webhook-signature']
  if (!msgId || !timestamp || !signature) throw new Error('Missing webhook headers')

  const base64Secret = hookSecret.replace('v1,whsec_', '')
  const keyBytes = Uint8Array.from(atob(base64Secret), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const content = new TextEncoder().encode(`${msgId}.${timestamp}.${payload}`)
  const sig = await crypto.subtle.sign('HMAC', key, content)
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))

  const valid = signature.split(' ').some(s => {
    const val = s.startsWith('v1,') ? s.slice(3) : s
    return val === expected
  })
  if (!valid) throw new Error('Invalid signature')

  return JSON.parse(payload)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  try {
    const {
      user,
      email_data,
    } = await verifyWebhook(payload, headers) as {
      user: { email: string }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
      }
    }

    const subject = '2048 — Your Sign-In Code'

    // Build OTP digits as game tiles
    const digits = email_data.token.split('')
    const digitCells = digits.map(d =>
      `<td style="width:44px;height:52px;background:#fef3c7;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:28px;font-weight:bold;color:#78350f;border:2px solid #fde68a;">${d}</td>`
    ).join('')

    // Build the magic link URL using the token_hash.
    // Supabase verify endpoint accepts token_hash for one-click sign-in.
    const redirectTo = email_data.redirect_to || ''
    const magicLink = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(email_data.token_hash)}&type=email&redirect_to=${encodeURIComponent(redirectTo)}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#fef3c7;font-family:'Trebuchet MS',Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(120,53,15,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#92400e;padding:28px 40px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:#b45309;border-radius:8px;padding:6px 18px;">
                  <span style="font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:44px;font-weight:bold;color:#fcd34d;letter-spacing:-1px;line-height:1.1;">2048</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 32px;">

            <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#78350f;text-align:center;">Your sign-in code</p>
            <p style="margin:0 0 28px;font-size:14px;color:#a16207;text-align:center;">Type the code below, or click the button to sign in instantly.</p>

            <!-- OTP tiles -->
            <table role="presentation" cellpadding="0" cellspacing="6" style="margin:0 auto 8px;" align="center">
              <tr>${digitCells}</tr>
            </table>

            <!-- "Your code" label under tiles -->
            <p style="margin:0 0 28px;font-size:12px;color:#a16207;text-align:center;letter-spacing:0.5px;">YOUR 6-DIGIT CODE</p>

            <!-- Divider with OR -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="border-bottom:1px solid #fde68a;width:45%;vertical-align:middle;">&nbsp;</td>
                <td style="width:10%;text-align:center;vertical-align:middle;padding:0 10px;">
                  <span style="font-size:12px;color:#b45309;font-weight:bold;white-space:nowrap;">OR</span>
                </td>
                <td style="border-bottom:1px solid #fde68a;width:45%;vertical-align:middle;">&nbsp;</td>
              </tr>
            </table>

            <!-- Magic link button -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td style="border-radius:10px;background:#d97706;">
                  <a href="${magicLink}"
                     target="_blank"
                     style="display:inline-block;padding:14px 40px;font-family:'Trebuchet MS',Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;background:#d97706;letter-spacing:0.3px;">
                    Sign In to 2048
                  </a>
                </td>
              </tr>
            </table>

            <!-- Expiry notice -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;background:#fef3c7;border-radius:8px;" align="center">
              <tr>
                <td style="padding:10px 20px;text-align:center;">
                  <span style="font-size:13px;color:#92400e;font-weight:bold;">Both the code and link expire in 10 minutes</span>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#b4a08a;text-align:center;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fef3c7;padding:16px 32px;text-align:center;border-top:1px solid #fde68a;">
            <p style="margin:0;font-size:12px;color:#a16207;">2048 Game &mdash; Join the tiles, get to 2048!</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') || '2048 Game <onboarding@resend.dev>',
        to: [user.email],
        subject,
        html,
      }),
    }).catch((err) => {
      console.error('Resend send failed:', err)
    })
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string }
    return new Response(
      JSON.stringify({
        error: {
          http_code: err.code ?? 500,
          message: err.message ?? 'Unknown error',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
