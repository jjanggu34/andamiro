<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
let timer = null

onMounted(() => {
  timer = setTimeout(() => router.replace('/login'), 2000)
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
