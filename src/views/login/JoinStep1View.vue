<script setup>
import { useJoinStore } from '@/stores/join'
import { useRouter } from 'vue-router'
import FooterCtp from '@/components/layout/FooterCtp.vue'

const join   = useJoinStore()
const router = useRouter()

function next() {
  if (!join.nickname.trim()) return
  router.push('/join/2')
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
              <em>닉네임을<br />입력해 주세요</em>
              <span>안다미로가 부를 이름이에요</span>
            </div>
          </div>
          <div class="form-content">
              <div class="form-group">
                <label class="sr-only" for="joinNickname">닉네임</label>
                <input
                  id="joinNickname"
                  v-model="join.nickname"
                  type="text"
                  placeholder="닉네임"
                  maxlength="10"
                  @keyup.enter="next"
                />
                <span class="input-count">{{ join.nickname.length }}/10</span>
              </div>
            </div>
        </section>
      </main>

      <FooterCtp label="다음" :disabled="!join.nickname.trim()" @click="next" />
    </div>
  </div>
</template>

<style scoped lang="scss">
#bodyWrap.join {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: $white;

  main {
    flex: 1;
    padding: 60px 24px 0;

    .importance-content {
      background: transparent;
      padding: 0;
    }

    .text-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 32px;

      em {
        font-size: $font22;
        font-weight: $font-b;
        color: $title;
        font-style: normal;
        line-height: 1.4;
      }

      span {
        font-size: $font14;
        color: $text-sub;
      }
    }

    .form-group {
      position: relative;

      input {
        width: 100%;
        height: 52px;
        padding: 0 44px 0 16px;
        border: 1px solid $border;
        border-radius: $radius-md;
        font-size: $font16;
        color: $title;
        background: $white;

        &:focus { border-color: $primary; outline: none; }
      }

      .input-count {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: $font12;
        color: $text-disabled;
      }
    }
  }
}
</style>

