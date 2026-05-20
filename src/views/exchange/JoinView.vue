<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const exchange = useExchangeStore()

const inviteToken = route.query.token ?? route.query.id ?? ''
const post     = ref(null)
const code     = ref('')
const showCode = ref(false)
const joining  = ref(false)
const error    = ref('')

const isWebView = computed(() => {
  const ua = navigator.userAgent
  return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN/i.test(ua) || (/Android/.test(ua) && /; wv\)/.test(ua))
})

onMounted(async () => {
  if (!inviteToken) { error.value = '유효하지 않은 초대 링크예요.'; return }
  if (!auth.user) return  // 로그인 안내 UI 표시

  const invitation = await exchange.getInvitationPreview(inviteToken)
  if (!invitation?.post) { error.value = '존재하지 않는 초대예요.'; return }
  post.value = invitation.post
})

async function loginWithGoogle() {
  try { await auth.signInWithGoogle(inviteToken) }
  catch { error.value = '로그인에 실패했어요. 다시 시도해 주세요.' }
}

async function join() {
  if (!post.value) return
  joining.value = true
  error.value   = ''
  try {
    const postId = await exchange.acceptInvitation(inviteToken, code.value.trim())
    if (postId === false) { error.value = '비밀번호가 틀렸어요.'; return }
    router.replace(`/exchange/view/${postId}`)
  } catch (e) {
    error.value = e?.message || '입장 중 오류가 발생했어요.'
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="join-wrap">
    <div class="join-card">
      <template v-if="!auth.user">
        <p class="join-label">교환일기 초대</p>
        <p class="join-login-desc">로그인 후 초대를 수락할 수 있어요.</p>
        <div v-if="isWebView" class="join-webview-warn">
          <p class="join-webview-warn__title">⚠️ 구글 로그인이 지원되지 않아요</p>
          <p class="join-webview-warn__desc">하단 메뉴의 <strong>다른 브라우저로 열기</strong>를 눌러 Chrome에서 열어주세요.</p>
        </div>
        <button class="join-btn join-btn--google" :disabled="isWebView" @click="loginWithGoogle">
          Google로 로그인
        </button>
        <p v-if="error" class="join-error">{{ error }}</p>
      </template>

      <template v-else-if="post">
        <p class="join-label">교환일기 초대</p>
        <img v-if="post.image_url" :src="post.image_url" class="join-img" alt="" />
        <h2 class="join-title">{{ post.title }}</h2>
        <p class="join-desc">{{ post.content }}</p>

        <div class="join-code-wrap">
          <label class="join-code-label">비밀번호</label>
          <div class="join-pw-wrap">
            <input
              v-model="code"
              class="join-code-input"
              :type="showCode ? 'text' : 'password'"
              placeholder="비밀번호를 입력해 주세요"
              maxlength="20"
              @keydown.enter="join"
            />
            <button type="button" class="join-pw-eye" @click="showCode = !showCode">
              <svg v-if="showCode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <p v-if="error" class="join-error">{{ error }}</p>

        <button class="join-btn" :disabled="joining" @click="join">
          {{ joining ? '입장 중…' : '방 입장하기' }}
        </button>
      </template>

      <template v-else-if="error">
        <p class="join-error">{{ error }}</p>
        <button class="join-btn" @click="router.replace('/exchange')">교환일기로 돌아가기</button>
      </template>

      <template v-else>
        <p class="join-loading">초대 정보를 불러오는 중…</p>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.join-wrap {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-color;
  padding: 24px;
}

.join-card {
  background: $white;
  border-radius: 24px;
  padding: 32px 24px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.join-label {
  font-size: $font12;
  color: $primary;
  font-weight: $font-sb;
  background: rgba(66, 131, 243, 0.1);
  padding: 4px 12px;
  border-radius: 100px;
}

.join-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 16px;
}

.join-title {
  font-size: $font20;
  font-weight: $font-b;
  color: $title;
  text-align: center;
}

.join-desc {
  font-size: $font14;
  color: $text-sub;
  text-align: center;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.join-code-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.join-code-label {
  font-size: $font13;
  font-weight: $font-sb;
  color: $title;
}

.join-pw-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.join-pw-eye {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: $text-disabled;
  display: flex;
  align-items: center;

  svg { width: 20px; height: 20px; }
  &:hover { color: $text-sub; }
}

.join-code-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid $border;
  border-radius: 12px;
  padding: 0 44px 0 14px;
  font-size: $font16;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: $primary; }
  &::placeholder { color: $text-disabled; }
}

.join-btn {
  width: 100%;
  height: 52px;
  background: $primary;
  color: $white;
  border: none;
  border-radius: 14px;
  font-size: $font16;
  font-weight: $font-sb;
  cursor: pointer;
  margin-top: 4px;

  &:disabled { opacity: 0.45; cursor: default; }
}

.join-loading,
.join-error {
  font-size: $font14;
  color: $text-sub;
  text-align: center;
}

.join-error { color: #dc2626; }

.join-login-desc {
  font-size: $font14;
  color: $text-sub;
  text-align: center;
}

.join-btn--google {
  background: $white;
  color: $title;
  border: 1.5px solid $border;
}

.join-webview-warn {
  width: 100%;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 12px;
  padding: 12px 14px;
  text-align: left;

  &__title { font-size: $font13; font-weight: $font-sb; color: #e65100; margin-bottom: 6px; }
  &__desc   { font-size: $font12; color: #5d4037; line-height: 1.6; }
}
</style>
