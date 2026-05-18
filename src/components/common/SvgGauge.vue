<script setup>
import { computed } from 'vue'

const props = defineProps({
  score:     { type: Number, default: 0 },
  colorFrom: { type: String, default: '#6ee7c0' },
  colorTo:   { type: String, default: '#059669' },
})

// 240×168 viewBox, 중심 (120, 100), 반지름 70
// ECharts startAngle=220 / endAngle=-40 → 260° 호
// SVG 회전 140°로 동일한 위치 재현
const R     = 70
const C     = 2 * Math.PI * R      // 전체 둘레 ≈ 439.82
const TRACK = C * (260 / 360)      // 260° 호 길이 ≈ 317.24
const GAP   = C - TRACK            // 나머지 ≈ 122.58

// dashoffset: TRACK(0점) → 0(100점), CSS transition으로 애니메이션
const dashOffset = computed(() => TRACK * (1 - props.score / 100))

const uid    = Math.random().toString(36).slice(2, 8)
const gradId = `sg-${uid}`
</script>

<template>
  <svg viewBox="0 0 240 168" class="svg-gauge" aria-hidden="true">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   :stop-color="colorFrom" />
        <stop offset="100%" :stop-color="colorTo" />
      </linearGradient>
    </defs>

    <!-- 배경 트랙 -->
    <circle
      cx="120" cy="100" :r="R"
      fill="none"
      stroke="#EFF2F3"
      stroke-width="14"
      stroke-linecap="round"
      :stroke-dasharray="`${TRACK} ${GAP}`"
      transform="rotate(140 120 100)"
    />

    <!-- 진행 호 -->
    <circle
      cx="120" cy="100" :r="R"
      fill="none"
      :stroke="`url(#${gradId})`"
      stroke-width="14"
      stroke-linecap="round"
      :stroke-dasharray="`${TRACK} ${GAP}`"
      :style="{ strokeDashoffset: dashOffset }"
      transform="rotate(140 120 100)"
      class="svg-gauge__arc"
    />
  </svg>
</template>

<style scoped>
.svg-gauge {
  width: 240px;
  height: 168px;
  overflow: visible;
}
.svg-gauge__arc {
  transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
