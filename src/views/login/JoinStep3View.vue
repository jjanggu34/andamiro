<script setup>
import { useJoinStore } from '@/stores/join'
import { useRouter } from 'vue-router'
import FooterCtp from '@/components/layout/FooterCtp.vue'

const join   = useJoinStore()
const router = useRouter()

const genders = [
  { value: '남성', img: '/assets/img/login/img-m.png' },
  { value: '여성', img: '/assets/img/login/img-w.png' },
]

function next() {
  if (!join.gender) return
  router.push('/join/4')
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
              <em>성별을<br />알려주세요</em>
              <span>맞춤 감정 분석을 위해 필요해요</span>
            </div>
          </div>
          <div class="form-content">
            <div class="form-group">
              <fieldset class="tyep-button ico">
                <legend class="sr-only">성별 선택</legend>
                <label
                  v-for="g in genders"
                  :key="g.value"
                  class="radio"
                  :for="`joinGender${g.value}`"
                >
                  <input
                    type="radio"
                    :id="`joinGender${g.value}`"
                    name="joinGender"
                    :value="g.value"
                    v-model="join.gender"
                  />
                  <div class="radio-face">
                    <img :src="g.img" :alt="g.value" />
                    <span class="radio-text">{{ g.value }}</span>
                  </div>
                </label>
              </fieldset>
            </div>
          </div>
        </section>
      </main>
      <FooterCtp label="다음" :disabled="!join.gender" @click="next" />
    </div>
  </div>
</template>
