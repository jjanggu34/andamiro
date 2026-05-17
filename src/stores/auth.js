import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user      = ref(null)
  const profile   = ref(null)
  const loading   = ref(true)
  const profileLoaded = ref(false)

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
  }

  async function init(code = null) {
    if (!loading.value) return
    try {
      if (code) {
        // 코드 교환은 네트워크 요청 — 15초 타임아웃
        const codeTimeout = new Promise(resolve => setTimeout(resolve, 15000))
        await Promise.race([supabase.auth.exchangeCodeForSession(code), codeTimeout])
      }
      // 일부 브라우저/PWA 환경에서는 세션 복구가 지연될 수 있어 초기 진입을 오래 막지 않는다.
      const { data } = await withTimeout(supabase.auth.getSession(), 5000)
      user.value = data.session?.user ?? null
      if (user.value) {
        // 프로필 조회가 오래 걸려도 앱 전체를 스플래시에 묶어두지 않는다.
        try {
          await withTimeout(fetchProfile(), 10000)
        } catch {
          profileLoaded.value = false
        }
      } else {
        profileLoaded.value = true
      }
    } catch {
      user.value    = null
      profile.value = null
      profileLoaded.value = true
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange(async (_, session) => {
      user.value = session?.user ?? null
      if (user.value) await fetchProfile()
      else {
        profile.value = null
        profileLoaded.value = true
      }
    })
  }

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()
      if (error) {
        profile.value = null
        return
      }
      profile.value = data
    } finally {
      profileLoaded.value = true
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value    = null
    profile.value = null
    profileLoaded.value = true
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

  const isNewUser = () => user.value && profileLoaded.value && !profile.value

  return { user, profile, loading, profileLoaded, init, fetchProfile, signOut, signInWithGoogle, isNewUser }
})
