import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user      = ref(null)
  const profile   = ref(null)
  const loading   = ref(true)
  const profileLoaded = ref(false)

  let _initPromise = null

  async function init() {
    if (!loading.value) return
    if (_initPromise) return _initPromise

    const hasOAuthCode = new URLSearchParams(window.location.search).has('code')

    _initPromise = (async () => {
      try {
        if (hasOAuthCode) {
          // OAuth 콜백: Supabase가 코드를 자동 교환 → SIGNED_IN 이벤트를 기다림
          await new Promise((resolve) => {
            let settled = false
            const done = () => { if (!settled) { settled = true; resolve() } }
            supabase.auth.onAuthStateChange(async (event, session) => {
              user.value = session?.user ?? null
              if (user.value) await fetchProfile().catch(() => { profileLoaded.value = false })
              else { profile.value = null; profileLoaded.value = true }
              if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') done()
              else if (event === 'INITIAL_SESSION' && session?.user) done()
            })
            setTimeout(done, 10000)
          })
        } else {
          // 일반 진입: getSession()으로 직접 세션 복구 (가장 신뢰성 높음)
          const { data } = await supabase.auth.getSession()
          user.value = data.session?.user ?? null
          if (user.value) await fetchProfile().catch(() => { profileLoaded.value = false })
          else { profile.value = null; profileLoaded.value = true }
        }
      } catch {
        user.value = null; profile.value = null; profileLoaded.value = true
      } finally {
        loading.value = false
        _initPromise = null
      }

      // 이후 토큰 갱신 / 로그아웃 등 세션 변화를 반영하는 상시 리스너
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          user.value = null; profile.value = null; profileLoaded.value = true
        } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          user.value = session?.user ?? null
          if (user.value) await fetchProfile().catch(() => {})
        }
      })
    })()

    return _initPromise
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

  async function exchangeOAuthCode(code) {
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch { /* 자동 교환된 경우 무시 */ }
    try {
      const { data } = await supabase.auth.getSession()
      user.value = data.session?.user ?? null
      if (user.value) await fetchProfile()
      else profileLoaded.value = true
    } catch {
      user.value = null
      profileLoaded.value = true
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value    = null
    profile.value = null
    profileLoaded.value = true
  }

  async function signInWithGoogle(joinPostId = null, pendingInvite = null) {
    const params = new URLSearchParams()
    if (joinPostId)    params.set('pendingJoin',   joinPostId)
    if (pendingInvite) params.set('pendingInvite', pendingInvite)
    const qs = params.toString()
    const redirectTo = qs ? `${window.location.origin}?${qs}` : window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  const isNewUser = () => user.value && profileLoaded.value && !profile.value

  return { user, profile, loading, profileLoaded, init, exchangeOAuthCode, fetchProfile, signOut, signInWithGoogle, isNewUser }
})
