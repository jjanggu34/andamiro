<script setup>
import { useJoinStore } from '@/stores/join'
import { useRouter } from 'vue-router'
import FooterCtp from '@/components/layout/FooterCtp.vue'

const join   = useJoinStore()
const router = useRouter()

const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대 이상']

function next() {
  if (!join.ageGroup) return
  router.push('/join/3')
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
              <em>연령대를<br />알려주세요</em>
              <span>맞춤 감정 분석을 위해 필요해요</span>
            </div>
          </div>
          <div class="form-content">
            <div class="form-group">
              <fieldset class="tyep-button">
                <legend class="sr-only">연령대 선택</legend>
                <label
                  v-for="age in ageGroups"
                  :key="age"
                  class="radio"
                  :for="`joinAge${age}`"
                >
                  <input
                    type="radio"
                    :id="`joinAge${age}`"
                    name="joinAge"
                    :value="age"
                    v-model="join.ageGroup"
                  />
                  <span>{{ age }}</span>
                </label>
              </fieldset>
            </div>
          </div>
        </section>
      </main>
      <FooterCtp label="다음" :disabled="!join.ageGroup" @click="next" />
    </div>
  </div>
</template>

