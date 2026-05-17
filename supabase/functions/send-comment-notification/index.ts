import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

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
  try {
    await webpush.sendNotification(fullSubscription, payload, {
      TTL: 86400,
      vapidDetails: {
        subject: VAPID_SUBJECT,
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: VAPID_PRIVATE_KEY,
      },
    })
  } catch (error) {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error
      ? String(error.statusCode)
      : 'unknown'
    throw new Error(`push_failed:${statusCode}:${subscription.endpoint}`)
  }
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
