<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GaugeChart } from 'echarts/charts'
import VChart from 'vue-echarts'
import PageLayout from '@/components/layout/PageLayout.vue'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import { useChatStore } from '@/stores/chat'
import { useDiaryStore } from '@/stores/diary'
import { useAnalysisAgent } from '@/composables/useAnalysisAgent'

use([CanvasRenderer, GaugeChart])

const router      = useRouter()
const chat        = useChatStore()
const diary       = useDiaryStore()
const { analyze } = useAnalysisAgent()
const openModal   = inject('openModal')

const today = new Date().toISOString().split('T')[0]

// ── 상태 ──
const loading    = ref(true)
const analysis   = ref(null)
const gaugeScore = ref(0)         // ECharts 실제 값 (애니메이션 트리거)
const mainScore  = ref(0)         // 숫자 카운트업 표시용
const saving     = ref(false)
const saveError  = ref('')

// ── 감정별 게이지 색상 ──
const GAUGE_COLORS = {
  best:   { from: '#FFE066', to: '#FF8C00' },
  good:   { from: '#6ee7c0', to: '#059669' },
  normal: { from: '#b8d9ff', to: '#2f6feb' },
  bad:    { from: '#d8b4fe', to: '#7c3aed' },
  worst:  { from: '#fca5a5', to: '#dc2626' },
}
const gaugeColors = computed(() => GAUGE_COLORS[chat.emotion] ?? GAUGE_COLORS.normal)

// ── 파생 데이터 ──
const title  = computed(() => analysis.value?.mood ?? '')
const scores = computed(() =>
  analysis.value
    ? Object.entries(analysis.value.metrics).map(([label, val]) => ({ label, val }))
    : []
)

// ── ECharts 게이지 옵션 ──
const gaugeOption = computed(() => ({
  animation: true,
  animationDuration: 1200,
  animationEasing: 'cubicOut',
  series: [{
    type: 'gauge',
    startAngle: 220,
    endAngle: -40,
    min: 0,
    max: 100,
    radius: '88%',
    roundCap: true,
    progress: {
      show: true,
      roundCap: true,
      width: 14,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: gaugeColors.value.from },
            { offset: 1, color: gaugeColors.value.to },
          ],
        },
      },
    },
    axisLine: {
      roundCap: true,
      lineStyle: { width: 14, color: [[1, '#EFF2F3']] },
    },
    pointer:   { show: false },
    axisTick:  { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    title:     { show: false },
    detail:    { show: false },
    data: [{ value: gaugeScore.value }],
  }],
}))

// ── 숫자 카운트업 ──
function animateScore(target) {
  gaugeScore.value = target       // ECharts 자체 애니메이션
  const duration = 1200
  const start = Date.now()
  const tick = () => {
    const p = Math.min((Date.now() - start) / duration, 1)
    mainScore.value = Math.round((1 - Math.pow(1 - p, 3)) * target)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ── 분석 실행 ──
const FALLBACK = {
  score: 60, mood: '보통이에요',
  metrics: { 에너지: 60, 안정감: 60, 집중력: 60, 긍정성: 60 },
  insight: '오늘 하루도 수고하셨어요. 내일도 좋은 하루 되세요.',
  recommendations: [
    { title: '충분한 휴식', body: '오늘 하루를 돌아보며 쉬어가세요.' },
    { title: '가벼운 산책', body: '맑은 공기와 함께 내일을 준비해봐요.' },
  ],
  summary: chat.content.slice(0, 100),
}

async function runAnalysis() {
  try {
    analysis.value = await analyze(chat.emotion, chat.messages)
  } catch {
    analysis.value = FALLBACK
  } finally {
    loading.value = false
    animateScore(analysis.value.score)
  }
}

// ── 저장 후 이동 ──
async function saveAndGo(path, state = {}) {
  saving.value = true
  saveError.value = ''
  try {
    await diary.save({
      date:    today,
      emotion: chat.emotion,
      content: chat.content,
      summary: JSON.stringify({
        headline: analysis.value?.headline,
        insight:  analysis.value?.insight,
        color:    analysis.value?.color,
        tags:     analysis.value?.tags,
        tips:     analysis.value?.tips,
      }),
    })
    chat.reset()
    router.push({ path, state })
  } catch (e) {
    console.error('[save error]', e)
    saveError.value = e?.message || e?.code || JSON.stringify(e) || '저장에 실패했어요.'
  } finally {
    saving.value = false
  }
}

const goHome     = () => saveAndGo('/main')
const goExchange = () => openModal({
  icon:        '📖',
  title:       '교환일기를 작성할까요?',
  description: '오늘의 감정을 친구와 나눠보세요.',
  btnLabel:    '교환일기 작성하기',
  onConfirm:   () => saveAndGo('/exchange/write', { summary: analysis.value?.summary ?? chat.content }),
})

onMounted(runAnalysis)
</script>

<template>
  <PageLayout title="오늘의 일기분석" back-to="/chat">
    <template #body>
      <main class="result-main">

        <!-- 로딩 -->
        <div v-if="loading" class="result-loading">
          <div class="result-loading__dots">
            <span></span><span></span><span></span>
          </div>
          <p>감정을 분석하고 있어요…</p>
        </div>

        <template v-else>
          <!-- 점수 섹션 -->
          <section class="importance-content">
            <div class="text-content">
              <div class="text-group">
                <span>데일리 채팅 분석</span>
                <em>오늘의 감정 점수</em>
              </div>
            </div>
            <div class="grap-content">
              <div class="grap-group score-chart">
                <VChart class="gauge-chart" :option="gaugeOption" autoresize />
                <div class="gauge-center">
                  <p class="gauge-title">{{ title }}</p>
                  <p class="gauge-score">{{ mainScore }}</p>
                  <p class="gauge-label">SCORE</p>
                </div>
              </div>
              <div class="grap-group score-list">
                <div v-for="item in scores" :key="item.label" class="score-item">
                  <span class="score-item__val">{{ item.val }}</span>
                  <div class="score-item__bar">
                    <div class="score-item__fill" :style="{ width: item.val + '%' }"></div>
                  </div>
                  <span class="score-item__label">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 카드 섹션 -->
          <section class="card-content">
            <div class="card-item">
              <h3>
                <span class="icon01"></span>
                오늘은 이렇게 보내고 계시는군요!
              </h3>
              <p class="result-insights">{{ analysis.insight }}</p>
              <div class="card-tips">
                <h4>채팅 요약</h4>
                <p>{{ analysis.summary }}</p>
              </div>
            </div>
            <div class="card-item">
              <h3>
                <span class="icon02"></span>
                내일은 이렇게 준비해보세요!
              </h3>
              <ol class="card-ol-list">
                <li v-for="(rec, i) in analysis.recommendations" :key="i" class="result-reco">
                  <em>{{ rec.title }}</em>
                  <p>{{ rec.body }}</p>
                </li>
              </ol>
            </div>
          </section>

          <p v-if="saveError" class="result-error" role="alert">{{ saveError }}</p>
        </template>

      </main>

      <FooterCtp
        secondary-label="교환일기작성"
        :label="saving ? '저장 중…' : '홈으로'"
        :disabled="loading || saving"
        :secondary-disabled="loading || saving"
        @secondary-click="goExchange"
        @click="goHome"
      />
    </template>
  </PageLayout>
</template>

<style scoped lang="scss">
.result-main {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
}

// ── 로딩 ──
.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  color: $text-sub;
  font-size: $font14;

  &__dots {
    display: flex;
    gap: 6px;
    span {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: $primary;
      animation: result-bounce 1.2s infinite ease-in-out;
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
}
@keyframes result-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-6px); opacity: 1; }
}

// ── 점수 섹션 ──

.text-content { margin-bottom: 8px; }
.text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grap-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

// ── ECharts 게이지 ──
.grap-group.score-chart {
  position: relative;
  width: 240px;
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gauge-chart {
  width: 240px;
  height: 168px;
}
.gauge-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -38%);
  gap: 2px;
  pointer-events: none;
}
.gauge-title { font-size: $font14; color: $text-sub; }
.gauge-score {
  font-size: 44px;
  font-weight: $font-eb;
  color: $title;
  line-height: 1;
}
.gauge-label {
  font-size: $font12;
  color: $text-disabled;
  font-weight: $font-m;
  letter-spacing: 0.08em;
}

// ── 메트릭 목록 ──
.grap-group.score-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.score-item__label { color: $text-sub; }
.score-item__val {
  font-size: $font16;
  font-weight: $font-sb;
  color: $title;
  small { font-size: $font12; color: $text-disabled; }
}
.score-item__bar {
  width: 100%;
  height: 14px;
  background: #eef3fc;
  border-radius: 4px;
  overflow: hidden;
}
.score-item__fill {
  height: 100%;
  background: linear-gradient(90deg, v-bind('gaugeColors.from'), v-bind('gaugeColors.to'));
  border-radius: 100px;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}


.card-item {

    &:first-of-type{
      --card-tips-bg:   #FFFCF6;
      --card-tips-text: #786258;
    }

    &:nth-of-type(2)  {
      h3 {
        span { background-color:#F0F9F1; }
      }
    }

}


// ── 아이콘 ──
.icon01::before {
  background: #ffa014;
  mask-image: url("/public/assets/img/result/ico-01.svg");
  -webkit-mask-image: url("/public/assets/img/result/ico-01.svg");
}
.icon02::before {
  background: #7AC47D;
  mask-image: url("/public/assets/img/result/ico-02.svg");
  -webkit-mask-image: url("/public/assets/img/result/ico-02.svg");
}



:deep(.button-content--duo) {
  .btn-ctp { flex: 0 0 120px; }
  .btn-ctp--secondary { flex: 1; }
}


</style>
