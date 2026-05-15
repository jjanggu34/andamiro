<script setup>
import { ref, computed, onMounted } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import NoData from '@/components/common/NoData.vue'
import { useDiaryStore } from '@/stores/diary'
import { useAdviceEnricher } from '@/composables/useAdviceEnricher'

const diary = useDiaryStore()
const { enrich } = useAdviceEnricher()

const today = new Date()
const todayStr = today.toISOString().split('T')[0]

const SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 }
const EMOTION_KO = { best: '최고예요!', good: '좋아요!', normal: '보통이에요', bad: '별로예요', worst: '최악이에요' }
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const record = ref(null)
const hasData = computed(() => !!record.value)

const dateLabel = computed(() => {
  const m = today.getMonth() + 1
  const d = today.getDate()
  const day = DAYS[today.getDay()]
  return `${m}월 ${d}일 ${day}요일`
})

const score = computed(() => SCORE_BY_EMOTION[record.value?.emotion] ?? 0)

const parsed = computed(() => {
  try { return JSON.parse(record.value?.result ?? '') }
  catch { return null }
})
const headline = computed(() =>
  parsed.value?.headline ?? EMOTION_KO[record.value?.emotion] ?? '오늘의 감정'
)
const adviceText = computed(() =>
  parsed.value?.insight ?? record.value?.result ?? ''
)
const colorText = computed(() => parsed.value?.color ?? '')
const tags = computed(() => parsed.value?.tags ?? [])
const tips = computed(() => parsed.value?.tips ?? [])

onMounted(async () => {
  record.value = await diary.getByDate(todayStr)
  if (!record.value) return

  const p = parsed.value
  if (p && (!p.color || !p.tags || !p.tips)) {
    try {
      const extra = await enrich(record.value.emotion, p?.insight ?? record.value.result ?? '')
      const merged = { ...p, ...extra }
      record.value = { ...record.value, result: JSON.stringify(merged) }
      await diary.updateResult(record.value.id, record.value.result)
    } catch { /* 실패해도 기존 데이터 그대로 표시 */ }
  }
})
</script>

<template>
  <PageLayout title="조언" body-class="advice-page">
    <template #body>
      <main class="advice-page">
        <!-- 데이터 있을 때 -->
        <template v-if="hasData">
          <section class="importance-content">
            <div class="button-content" aria-label="포춘쿠키">
              <button type="button" class="advice-fortune-btn">
                <span>포춘쿠키를 확인하세요</span>
              </button>
            </div>
            <div class="text-content">
              <div class="text-group">
                <p class="advice-hero__date">{{ dateLabel }}</p>
                <h2 class="advice-hero__headline">{{ headline }}</h2>
                <p class="advice-hero__score">
                  <span class="advice-hero__score-num">{{ score }}</span>
                  <span class="advice-hero__score-unit">점</span>
                </p>
              </div>
            </div>
          </section>

          <section class="card-content">
            <div class="card-item" v-if="colorText || tags.length">
              <p class="advice-color-card__text">{{ colorText }}</p>
              <div class="advice-tags" v-if="tags.length">
                <span v-for="tag in tags" :key="tag" class="advice-tags__item"># {{ tag }}</span>
              </div>
            </div>
            <div class="card-item" v-if="adviceText">
              <h3>
                <span></span>
                AI 맞춤 조언
              </h3>
              <p class="advice-ai-body">{{ adviceText }}</p>
              <template v-if="tips.length">
                <div v-for="tip in tips" :key="tip.title" class="card-tips">
                  <h4>{{ tip.title }}</h4>
                  <p>{{ tip.body }}</p>
                </div>
              </template>
            </div>
          </section>
        </template>

        <!-- 데이터 없을 때 -->
        <NoData
          v-else
          title="오늘의 감정을 기록하면&#10;맞춤 조언을 드려요!"
          description="하루를 기록하고 AI의 따뜻한 조언을 받아보세요."
        />
      </main>
    </template>
    <template #footer>
      <AppTabBar />
    </template>
  </PageLayout>
</template>
