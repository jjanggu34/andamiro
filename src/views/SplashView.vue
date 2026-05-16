<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()
let timer = null

onMounted(() => {
  // 이미 로그인 상태면 바로 메인으로
  timer = setTimeout(() => router.replace(auth.user ? '/main' : '/login'), 1500)
})

onUnmounted(() => {
  clearTimeout(timer)
})
</script>

<template>
  <div class="wrap splash">
    <main class="splash">
      <div class="splash-content">
        <img src="/assets/img/main/img-splash.gif" alt="안다미로" class="splash-logo" />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.wrap.splash {
  height: 100dvh;
  background: $white;

  main.splash {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;

    .splash-content {
      display: flex;
      align-items: center;
      justify-content: center;

      .splash-logo {
        width: 200px;
        height: auto;
      }
    }
  }
}
</style>
