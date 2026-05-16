<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const exchange = useExchangeStore()

const code    = route.query.code ?? ''
const post    = ref(null)
const joining = ref(false)
const error   = ref('')

onMounted(async () => {
  if (!code) { error.value = '유효하지 않은 초대 링크예요.'; return }

  if (!auth.user) {
    sessionStorage.setItem('pendingJoin', code)
    router.replace('/login')
    return
  }

  await loadPost()
})

async function loadPost() {
  const { data } = await exchange.findPostByCode(code)
  if (!data) { error.value = '존재하지 않는 초대코드예요.'; return }
  post.value = data
}

async function join() {
  if (!post.value) return
  joining.value = true
  error.value   = ''
  try {
    const ok = await exchange.joinRoom(post.value.id, code)
    if (ok === false) { error.value = '입장에 실패했어요.'; return }
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
        <button class="join-btn" :disabled="joining" @click="join">
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
  margin-top: 8px;

  &:disabled { opacity: 0.6; cursor: default; }
}

.join-loading,
.join-error {
  font-size: $font14;
  color: $text-sub;
  text-align: center;
}

.join-error { color: #dc2626; }
</style>
