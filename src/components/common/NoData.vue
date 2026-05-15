<script setup>
import { useRouter } from 'vue-router'

defineProps({
  title:       { type: String, default: '당신의 하루를 들려주길\n기다리고 있어요!' },
  description: { type: String, default: '작은 기록이 모여 당신의 마음 지도가 완성돼요.' },
  buttonLabel: { type: String, default: '일기 쓰러가기' },
  buttonTo:    { type: String, default: '/chat' },
  //imgSrc:      { type: String, default: '/assets/img/com/img-none.png' },
})

const router = useRouter()
</script>

<template>
  <section class="no-data" aria-label="데이터 없음 안내">
    <div>
      <!--<img :src="imgSrc" alt="" class="no-data__img" />-->
      <div class="text-content">
        <div class="text-group">
          <p><em class="no-data__title">{{ title }}</em></p>
          <p>{{ description }}</p>
        </div>
        <div class="btn-content">
          <button type="button" class="btn-sub" @click="router.push(buttonTo)">
            {{ buttonLabel }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.no-data__title {
  white-space: pre-line;
}
</style>
