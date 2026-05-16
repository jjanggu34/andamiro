<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const exchange = useExchangeStore()

const postId  = route.query.id ?? ''
const post    = ref(null)
const code    = ref('')
const joining = ref(false)
const error   = ref('')

onMounted(async () => {
  if (!postId) { error.value = '유효하지 않은 초대 링크예요.'; return }

  if (!auth.user) {
    sessionStorage.setItem('pendingJoin', postId)
    router.replace('/login')
    return
  }

  const data = await exchange.getPostForJoin(postId)
  if (!data) { error.value = '존재하지 않는 방이에요.'; return }
  post.value = data
})

async function join() {
  if (!post.value || !code.value.trim()) return
  joining.value = true
  error.value   = ''
  try {
    const ok = await exchange.joinRoom(post.value.id, code.value.trim().toUpperCase())
    if (ok === false) { error.value = '초대코드가 올바르지 않아요.'; return }
    router.replace(`/exchange/view/${post.value.id}`)
  } catch {
    error.value = '입장 중 오류가 발생했어요.'
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="join-wrap">
    <div class="join-card">
      <template v-if="error">
        <p class="join-error">{{ error }}</p>
        <button class="join-btn" @click="router.replace('/exchange')">교환일기로 돌아가기</button>
      </template>

      <template v-else-if="post">
        <p class="join-label">교환일기 초대</p>
        <img v-if="post.image_url" :src="post.image_url" class="join-img" alt="" />
        <h2 class="join-title">{{ post.title }}</h2>
        <p class="join-desc">{{ post.content }}</p>

        <div class="join-code-wrap">
          <label class="join-code-label">초대코드 입력</label>
          <input
            v-model="code"
            class="join-code-input"
            type="text"
            placeholder="초대코드 입력"
            maxlength="20"
            @keydown.enter="join"
          />
        </div>

        <button class="join-btn" :disabled="joining || !code.trim()" @click="join">
          {{ joining ? '입장 중…' : '방 입장하기' }}
        </button>
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

.join-code-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid $border;
  border-radius: 12px;
  padding: 0 14px;
  font-size: $font16;
  letter-spacing: 3px;
  font-weight: $font-sb;
  text-transform: uppercase;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: $primary; }
  &::placeholder { letter-spacing: 0; font-weight: $font-l; }
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
</style>
