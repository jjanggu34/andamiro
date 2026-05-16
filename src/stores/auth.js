import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user      = ref(null)
  const profile   = ref(null)
  const loading   = ref(true)

  async function init(code = null) {
    if (!loading.value) return
    // 5초 안에 응답 없으면 비로그인 처리
    const timeout = new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 5000))
    try {
      if (code) await Promise.race([supabase.auth.exchangeCodeForSession(code), timeout])
      const { data } = await Promise.race([supabase.auth.getSession(), timeout])
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

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const isNewUser = () => user.value && !profile.value

  return { user, profile, loading, init, fetchProfile, signOut, signInWithGoogle, isNewUser }
})
