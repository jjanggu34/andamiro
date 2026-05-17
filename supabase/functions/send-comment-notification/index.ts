import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    subscriptions.map(async (subscription) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          title: '교환일기',
          body: `새 댓글이 달렸어요: ${post.title}`,
          url: `/exchange/view/${post.id}`,
        }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload || payload.status < 200 || payload.status >= 300) {
        throw new Error(`push_failed:${res.status}:${payload?.status ?? 'unknown'}`)
      }
    })
  )

  const delivered = pushResults.filter((result) => result.status === 'fulfilled').length
  const failed = pushResults.length - delivered
  return json({ delivered, failed, recipients: recipientIds.size })
})
