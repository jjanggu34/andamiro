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

  async function fetchPosts(filter = 'all') {
    const uid = userId()
    if (!uid) return

    let result = []

    // 내방: 내가 방장인 방 (댓글 포함)
    if (filter === 'all' || filter === 'mine') {
      const { data } = await supabase
        .from('exchange_posts')
        .select('*, exchange_comments(content, created_at)')
        .eq('user_id', uid)
      if (data) result.push(...data.map(p => ({ ...p, _role: 'owner' })))
    }

    // 공유: 내가 초대받은 방 (댓글 포함)
    if (filter === 'all' || filter === 'shared') {
      const { data } = await supabase
        .from('exchange_members')
        .select('post:exchange_posts(*, exchange_comments(content, created_at)), joined_at')
        .eq('user_id', uid)
      if (data) {
        result.push(
          ...data
            .filter(m => m.post)
            .map(m => ({ ...m.post, _role: 'member', _joined_at: m.joined_at }))
        )
      }
    }

    // 댓글 통계 계산 후 최근 활동순 정렬
    posts.value = result
      .map(p => {
        const coms = p.exchange_comments ?? []
        const sorted = [...coms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return {
          ...p,
          comment_count:   coms.length,
          latest_comment:  sorted[0]?.content ?? null,
          last_activity:   sorted[0]?.created_at ?? p.created_at,
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

    const { title, content, imageFile, password } = payload
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

    const { data, error } = await supabase
      .from('exchange_posts')
      .insert({ user_id: uid, title, content, image_url, password: password || null })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 비밀번호로 공유방 입장 (RPC)
  async function joinRoom(postId, password) {
    const { data, error } = await supabase
      .rpc('join_exchange_room', { p_post_id: postId, p_password: password })
    if (error) throw error
    return data  // true: 성공, false: 비밀번호 불일치
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

  async function deletePost(id) {
    const { error } = await supabase
      .from('exchange_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId())
    if (error) throw error
    posts.value = posts.value.filter(p => p.id !== id)
  }

  return { posts, comments, myExchangeCount, fetchPosts, getById, save, joinRoom, fetchComments, addComment, deletePost, fetchMyExchangeCount }
})
