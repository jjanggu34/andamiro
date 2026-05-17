import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VITE_VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = 'mailto:wnsxkai@gmail.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fromBase64Url(value: string): Uint8Array {
  return Uint8Array.from(
    atob(value.replace(/-/g, '+').replace(/_/g, '/')),
    (char) => char.charCodeAt(0)
  )
}

function toBase64Url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const array of arrays) {
    out.set(array, offset)
    offset += array.length
  }
  return out
}

async function signVapidJwt(audience: string): Promise<string> {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const signingInput = `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })}`

  const publicKey = fromBase64Url(VAPID_PUBLIC_KEY)
  const privateKey = fromBase64Url(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(publicKey.slice(1, 33)),
      y: toBase64Url(publicKey.slice(33, 65)),
      d: toBase64Url(privateKey),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`
}

async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  plaintext: string
) {
  const p256dh = fromBase64Url(subscription.keys.p256dh)
  const auth = fromBase64Url(subscription.keys.auth)
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey))
  const clientPublicKey = await crypto.subtle.importKey('raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  ))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authKey = await crypto.subtle.importKey('raw', auth, { name: 'HKDF' }, false, ['deriveBits'])
  const prk = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sharedBits, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    authKey,
    256
  ))
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HKDF' }, false, ['deriveBits'])
  const keyInfo = concat(
    new TextEncoder().encode('Content-Encoding: aesgcm\0'),
    new Uint8Array([0, 65]),
    p256dh,
    new Uint8Array([0, 65]),
    serverPublicKey
  )
  const nonceInfo = concat(
    new TextEncoder().encode('Content-Encoding: nonce\0'),
    new Uint8Array([0, 65]),
    p256dh,
    new Uint8Array([0, 65]),
    serverPublicKey
  )
  const contentKey = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo },
    prkKey,
    128
  ))
  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkKey,
    96
  ))
  const aesKey = await crypto.subtle.importKey('raw', contentKey, { name: 'AES-GCM' }, false, ['encrypt'])
  const padded = concat(new Uint8Array(2), new TextEncoder().encode(plaintext))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded))
  return { ciphertext, salt, serverPublicKey }
}

async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  post: { id: string; title: string }
) {
  const payload = JSON.stringify({
    title: '교환일기',
    body: `새 댓글이 달렸어요: ${post.title}`,
    url: `/exchange/view/${post.id}`,
  })
  const fullSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(fullSubscription, payload)
  const origin = new URL(subscription.endpoint).origin
  const jwt = await signVapidJwt(origin)
  const publicKey = toBase64Url(fromBase64Url(VAPID_PUBLIC_KEY))
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      Encryption: `salt=${toBase64Url(salt)}`,
      'Crypto-Key': `dh=${toBase64Url(serverPublicKey)}; vapid t=${jwt}; k=${publicKey}`,
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
      TTL: '86400',
    },
    body: ciphertext,
  })
  if (!res.ok) throw new Error(`push_failed:${res.status}:${subscription.endpoint}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401)

  let body: { post_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const postId = body.post_id?.trim()
  if (!postId) return json({ error: 'Missing post_id' }, 400)

  const { data: post, error: postError } = await admin
    .from('exchange_posts')
    .select('id, title, user_id')
    .eq('id', postId)
    .maybeSingle()
  if (postError || !post) return json({ error: 'Post not found' }, 404)

  const senderId = authData.user.id
  const { data: membership } = await admin
    .from('exchange_members')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', senderId)
    .maybeSingle()
  if (post.user_id !== senderId && !membership) return json({ error: 'Forbidden' }, 403)

  const { data: members, error: membersError } = await admin
    .from('exchange_members')
    .select('user_id')
    .eq('post_id', postId)
  if (membersError) return json({ error: membersError.message }, 500)

  const recipientIds = new Set<string>()
  if (post.user_id !== senderId) recipientIds.add(post.user_id)
  for (const member of members ?? []) {
    if (member.user_id !== senderId) recipientIds.add(member.user_id)
  }
  if (!recipientIds.size) return json({ delivered: 0, recipients: 0 })

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', [...recipientIds])
  if (subscriptionsError) return json({ error: subscriptionsError.message }, 500)
  if (!subscriptions?.length) return json({ delivered: 0, recipients: recipientIds.size })

  const pushResults = await Promise.allSettled(
    subscriptions.map((subscription) => sendPush(subscription, post))
  )

  const delivered = pushResults.filter((result) => result.status === 'fulfilled').length
  const failed = pushResults.length - delivered
  const errors = pushResults.flatMap((result) =>
    result.status === 'rejected'
      ? [result.reason instanceof Error ? result.reason.message : String(result.reason)]
      : []
  )

  const expiredEndpoints = errors.flatMap((error) => {
    const [code, status, endpoint] = error.split(':')
    return code === 'push_failed' && (status === '404' || status === '410') && endpoint ? [endpoint] : []
  })
  if (expiredEndpoints.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  return json({ delivered, failed, recipients: recipientIds.size, errors })
})
