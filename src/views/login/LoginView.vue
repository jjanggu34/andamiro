<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const error = ref('')

async function handleGoogle() {
  try {
    await auth.signInWithGoogle()
  } catch {
    error.value = '구글 로그인에 실패했습니다.'
  }
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <video
        class="login-animation"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        poster="/assets/img/login/movie.png"
        aria-hidden="true"
      >
        <source src="/assets/img/login/movie.mp4" type="video/mp4" />
      </video>

      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
                <em>하루의 시작과 마무리를<br /> 함께 만들어요!</em>
                <span>대화하며 쉽게 기록하고 함께 기록된<br />
                  AI 인사이트를 확인해 보세요</span>
            </div>
          </div>
        </section>
      </main>

      <footer class="button-ctp">
        <div class="button-content">
          <p v-if="error" class="login-error">{{ error }}</p>
          <button id="loginGoogleBtn" class="btn-line ico-google" @click="handleGoogle">
            Google 로그인
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
