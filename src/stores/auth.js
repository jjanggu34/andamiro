import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user      = ref(null)
  const profile   = ref(null)
  const loading   = ref(true)

  async function init(code = null) {
    if (!loading.value) return
    try {
      if (code) {
        // 코드 교환은 네트워크 요청 — 15초 타임아웃
        const codeTimeout = new Promise(resolve => setTimeout(resolve, 15000))
        await Promise.race([supabase.auth.exchangeCodeForSession(code), codeTimeout])
      }
      // getSession은 localStorage 읽기라 즉시 반환 — 타임아웃 불필요
      const { data } = await supabase.auth.getSession()
      user.value = data.session?.user ?? null
      if (user.value) await fetchProfile()
    } catch {
      user.value    = null
      profile.value = null
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange(async (_, session) => {
      user.value = session?.user ?? null
      if (user.value) await fetchProfile()
      else profile.value = null
    })
  }

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    if (error) { profile.value = null; return }
    profile.value = data
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value    = null
    profile.value = null
  }

  async function signInWithGoogle(joinPostId = null) {
    const redirectTo = joinPostId
      ? `${window.location.origin}?pendingJoin=${joinPostId}`
      : window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  const isNewUser = () => user.value && !profile.value

  return { user, profile, loading, init, fetchProfile, signOut, signInWithGoogle, isNewUser }
})
