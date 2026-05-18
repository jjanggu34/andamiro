import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export const useExchangeStore = defineStore('exchange', () => {
  const posts          = ref([])
  const comments       = ref([])
  const myExchangeCount = ref(0)

  function userId() {
    return useAuthStore().user?.id
  }

  async function getAuthHeaders() {
    // refreshSession()으로 항상 서버에서 신선한 토큰을 받아온다
    // Safari에서 getSession()이 만료 토큰을 반환하는 경우를 방어
    const { data, error } = await supabase.auth.refreshSession()
    if (!error && data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` }
    }
    // 갱신 실패 시 현재 세션 fallback
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('로그인이 필요해요.')
    return { Authorization: `Bearer ${session.access_token}` }
  }

  async function fetchPosts(filter = 'all') {
    const uid = userId()
    if (!uid) return

    const needOwn    = filter === 'all' || filter === 'mine'
    const needMember = filter === 'all' || filter === 'shared'

    const [ownRes, memberRes] = await Promise.all([
      needOwn
        ? supabase.from('exchange_posts').select('*, exchange_comments(content, created_at)').eq('user_id', uid)
        : Promise.resolve({ data: null }),
      needMember
        ? supabase.from('exchange_members').select('post:exchange_posts(*, exchange_comments(content, created_at)), joined_at').eq('user_id', uid)
        : Promise.resolve({ data: null }),
    ])

    let result = []
    if (ownRes.data)    result.push(...ownRes.data.map(p => ({ ...p, _role: 'owner' })))
    if (memberRes.data) {
      result.push(
        ...memberRes.data
          .filter(m => m.post)
          .map(m => ({ ...m.post, _role: 'member', _joined_at: m.joined_at }))
      )
    }

    posts.value = result
      .map(p => {
        const coms   = p.exchange_comments ?? []
        const sorted = [...coms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return {
          ...p,
          comment_count:  coms.length,
          latest_comment: sorted[0]?.content ?? null,
          last_activity:  sorted[0]?.created_at ?? p.created_at,
        }
      })
      .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))
  }

  async function fetchMyExchangeCount() {
    const uid = userId()
    if (!uid) return
    const [ownRes, memberRes] = await Promise.all([
      supabase.from('exchange_posts').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('exchange_members').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ])
    myExchangeCount.value = (ownRes.count ?? 0) + (memberRes.count ?? 0)
  }

  async function getById(id) {
    const { data } = await supabase
      .from('exchange_posts')
      .select('*')
      .eq('id', id)
      .single()
    return data ?? null
  }

  async function save(payload) {
    const uid = userId()
    if (!uid) throw new Error('not_authenticated')

    const { title, content, imageFile, password, clientRequestId } = payload
    let image_url = null

    if (imageFile) {
      const ext  = imageFile.name.split('.').pop().toLowerCase()
      const path = `${uid}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('exchange-images')
        .upload(path, imageFile)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('exchange-images')
          .getPublicUrl(path)
        image_url = publicUrl
      }
    }

    const authHeaders = await getAuthHeaders()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    let invokeData, invokeError
    try {
      ;({ data: invokeData, error: invokeError } = await supabase.functions.invoke('create-exchange-room', {
        body: { title, content, image_url, password: password || null, client_request_id: clientRequestId },
        headers: authHeaders,
        signal: controller.signal,
      }))
    } finally {
      clearTimeout(timer)
    }
    if (invokeError) {
      const body = await invokeError.context?.json?.().catch(() => null)
      throw new Error(body?.error || '방 생성에 실패했어요.')
    }
    const data = { ...invokeData.room, invitation_token: invokeData.invitation_token }

    // 낙관적 업데이트: 목록에 즉시 추가
    if (!posts.value.some(p => p.id === data.id)) {
      posts.value.unshift({
        ...data,
        _role:          'owner',
        comment_count:  0,
        latest_comment: null,
        last_activity:  data.created_at,
        exchange_comments: [],
      })
    }

    return data
  }

  async function getInvitation(postId) {
    const { data, error } = await supabase.functions.invoke('get-exchange-invitation', {
      body: { post_id: postId },
      headers: await getAuthHeaders(),
    })
    if (error) {
      const body = await error.context?.json?.().catch(() => null)
      throw new Error(body?.error || '초대 정보를 불러오지 못했어요.')
    }
    return data.invitation
  }

  async function regenerateInvitationCode(postId) {
    const { data, error } = await supabase.functions.invoke('regenerate-exchange-invite-code', {
      body: { post_id: postId },
      headers: await getAuthHeaders(),
    })
    if (error) {
      const body = await error.context?.json?.().catch(() => null)
      throw new Error(body?.error || '초대코드를 바꾸지 못했어요.')
    }
    return data.code
  }

  async function getInvitationPreview(inviteToken) {
    const { data, error } = await supabase.functions.invoke('get-exchange-invitation-preview', {
      body: { token: inviteToken },
      headers: await getAuthHeaders(),
    })
    if (error) return null
    return data?.invitation ?? null
  }

  async function findPostByCode(code) {
    return supabase
      .from('exchange_posts')
      .select('id')
      .eq('password', code)
      .single()
  }

  async function joinRoom(postId, password) {
    const uid = userId()
    if (!uid) throw new Error('not_authenticated')

    const { data: post, error: fetchErr } = await supabase
      .from('exchange_posts')
      .select('id, password, user_id')
      .eq('id', postId)
      .single()
    if (fetchErr || !post) throw new Error('방을 찾을 수 없어요.')

    const storedPw = (post.password ?? '').trim().toUpperCase()
    const inputPw  = (password ?? '').trim().toUpperCase()
    if (storedPw !== inputPw) return false
    if (post.user_id === uid) return true

    const { error: insertErr } = await supabase
      .from('exchange_members')
      .upsert({ post_id: postId, user_id: uid }, { onConflict: 'post_id,user_id' })
    if (insertErr) throw insertErr
    return true
  }

  async function acceptInvitation(tokenValue, password) {
    const { data, error } = await supabase.functions.invoke('accept-exchange-invitation', {
      body: { token: tokenValue, password },
      headers: await getAuthHeaders(),
    })
    if (error) {
      const body = await error.context?.json?.().catch(() => null)
      if (error.context?.status === 403 && body?.error === 'invalid_password') return false
      throw new Error(body?.error || '입장 중 오류가 발생했어요.')
    }
    return data.post_id
  }

  async function fetchComments(postId) {
    const { data } = await supabase
      .from('exchange_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    comments.value = data ?? []
  }

  async function addComment(postId, content) {
    const uid = userId()
    if (!uid) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('exchange_comments')
      .insert({ post_id: postId, user_id: uid, content })
      .select()
      .single()

    if (error) throw error
    comments.value.push(data)
    return data
  }

  async function sendCommentPush(postId) {
    const { data, error } = await supabase.functions.invoke('send-comment-notification', {
      body: { post_id: postId },
      headers: await getAuthHeaders(),
    })
    if (error) {
      const body = await error.context?.json?.().catch(() => null)
      throw new Error(body?.error || '댓글 알림 발송에 실패했어요.')
    }
    return data
  }

  async function deletePost(id) {
    const { error } = await supabase
      .from('exchange_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId())
    if (error) throw error
    posts.value = posts.value.filter(p => p.id !== id)
  }

  return { posts, comments, myExchangeCount, fetchPosts, getById, save, getInvitation, regenerateInvitationCode, getInvitationPreview, findPostByCode, joinRoom, acceptInvitation, fetchComments, addComment, sendCommentPush, deletePost, fetchMyExchangeCount }
})
