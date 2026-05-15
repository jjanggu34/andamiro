<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useDiaryStore } from '@/stores/diary'

const router = useRouter()
const auth   = useAuthStore()
const diary  = useDiaryStore()

const now   = new Date()
const year  = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based

const yearMonth  = computed(() => `${year.value}-${String(month.value + 1).padStart(2, '0')}`)
const monthLabel = computed(() => `${year.value}.${String(month.value + 1).padStart(2, '0')}`)
const nickname   = computed(() => auth.profile?.nickname ?? auth.user?.email?.split('@')[0] ?? '사용자')

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const EMOTION_KO  = { best: '최고예요!', good: '좋아요!', normal: '보통이에요', bad: '별로예요', worst: '최악이에요' }

// ── 캘린더 셀 배열 ──
const calendarDays = computed(() => {
  const y = year.value
  const m = month.value
  const firstDay = new Date(y, m, 1).getDay()
  const lastDate = new Date(y, m + 1, 0).getDate()
  const cells = Array(firstDay).fill(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  return cells
})

// ── date → emotion 매핑 ──
const emotionMap = computed(() => {
  const map = {}
  for (const d of diary.diaries) map[d.record_date] = d.emotion
  return map
})

function dateStr(day) {
  return `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function emotionForDay(day) {
  return day ? (emotionMap.value[dateStr(day)] ?? null) : null
}

// ── 오늘 판별 / 미래 판별 ──
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const isToday  = (day) => !!day && dateStr(day) === todayStr
const isFuture = (day) => !!day && dateStr(day) > todayStr

// ── 날짜 선택 ──
const selectedDay    = ref(null)
const selectedRecord = computed(() =>
  selectedDay.value
    ? (diary.diaries.find(d => d.record_date === dateStr(selectedDay.value)) ?? null)
    : null
)
function selectDay(day) {
  if (!day || isFuture(day)) return
  selectedDay.value = selectedDay.value === day ? null : day
}

// ── 선택 날짜 레이블 ("5월 6일 수요일") ──
const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  const ds = new Date(`${dateStr(selectedDay.value)}T12:00:00`)
  return `${month.value + 1}월 ${selectedDay.value}일 ${WEEK_LABELS[ds.getDay()]}요일`
})

// ── 선택 기록 요약 텍스트 ──
const selectedSummary = computed(() => {
  if (!selectedRecord.value) return ''
  try {
    const p = JSON.parse(selectedRecord.value.result ?? '')
    return p?.headline ?? p?.insight?.slice(0, 50) ?? ''
  } catch { return selectedRecord.value.content?.slice(0, 50) ?? '' }
})

// ── 기록 상세로 이동 ──
function goToRecord() {
  if (!selectedRecord.value) return
  router.push({ path: '/my/chat-view', query: { date: selectedRecord.value.record_date } })
}
function goToChat() {
  router.push('/chat/emotion')
}

// ── 월 이동 ──
function prevMonth() {
  if (month.value === 0) { year.value--; month.value = 11 }
  else month.value--
  selectedDay.value = null
  diary.fetchByMonth(yearMonth.value)
}
function nextMonth() {
  if (month.value === 11) { year.value++; month.value = 0 }
  else month.value++
  selectedDay.value = null
  diary.fetchByMonth(yearMonth.value)
}

// auth.user가 준비된 시점에 fetch (타이밍 문제 방지)
watch(() => auth.user, (user) => {
  if (user) diary.fetchByMonth(yearMonth.value)
}, { immediate: true })
</script>

<template>
  <AppLayout show-logout>
    <main class="main-page" role="main">

      <!-- 히어로 -->
      <section class="main-hero">
        <div class="text-content">
          <div class="text-group">
            <span>{{ nickname }}님, 오늘 하루는 어떠셨나요?</span>
            <em>지금 마음을 가볍게 남겨보세요!</em>
          </div>
          <div class="btn-content">
            <RouterLink to="/chat/emotion" class="btn-link">오늘 기록 남기러 가기</RouterLink>
          </div>
        </div>
      </section>

      <!-- 캘린더 -->
      <section class="importance-content round calendar">
        <div class="calendar-grid__item" id="mainCalendarHost" aria-label="월별 캘린더">
          <div class="dayflow-cal" role="application" aria-label="월별 달력">

            <!-- 헤더 -->
            <div class="dayflow-cal__head">
              <button type="button" class="title-font-20 dayflow-cal__month-label" aria-label="표시 중인 월">
                {{ monthLabel }}
              </button>
              <div class="dayflow-cal__nav">
                <button type="button" class="dayflow-cal__nav-btn dayflow-cal__nav-btn--prev" aria-label="이전 달" @click="prevMonth">‹</button>
                <button type="button" class="dayflow-cal__nav-btn dayflow-cal__nav-btn--next" aria-label="다음 달" @click="nextMonth">›</button>
              </div>
            </div>

            <!-- 요일 행 -->
            <div class="dayflow-cal__dow">
              <span v-for="d in WEEK_LABELS" :key="d" class="dayflow-cal__dow-cell">{{ d }}</span>
            </div>

            <!-- 날짜 그리드 -->
            <div class="dayflow-cal__grid">
              <button
                v-for="(day, i) in calendarDays"
                :key="i"
                type="button"
                class="dayflow-cal__day"
                :class="{
                  'dayflow-cal__day--muted':   !day,
                  'dayflow-cal__day--future':  isFuture(day),
                  [`dayflow-cal__day--${emotionForDay(day)}`]: !!emotionForDay(day),
                  'is-today':    isToday(day),
                  'is-selected': selectedDay === day && !!day,
                }"
                :disabled="!day || isFuture(day)"
                :aria-hidden="!day ? 'true' : undefined"
                :data-ymd="day ? dateStr(day) : undefined"
                @click="selectDay(day)"
              >
                <span class="dayflow-cal__clover" aria-hidden="true"></span>
                <span v-if="day" class="dayflow-cal__num">{{ day }}</span>
              </button>
            </div>

          </div>
        </div>

        <!-- 선택 날짜 기록 -->
        <template v-if="selectedDay">
          <hr>
          <div class="calendar-list">
            <h3 class="title-font-16">
              {{ selectedDayLabel }}
              <span>· {{ selectedRecord ? 1 : 0 }}개의 기록</span>
            </h3>
            <ul>
              <li v-if="selectedRecord"
                role="button" tabindex="0"
                @click="goToRecord"
                @keydown.enter="goToRecord"
              >
                <em :class="`ico-${selectedRecord.emotion}`">{{ EMOTION_KO[selectedRecord.emotion] }}</em>
                <span class="calendar-list__summary">{{ selectedSummary || '이날의 기록을 함께 돌아봐요.' }}</span>
              </li>
              <li v-else
                class="calendar-list__empty calendar-list__empty--action"
                role="button" tabindex="0"
                @click="goToChat"
                @keydown.enter="goToChat"
              >
                아직 작성한 일기가 없어요.
                <span class="calendar-list__empty-cta">일기쓰러가기</span>
              </li>
            </ul>
          </div>
        </template>

      </section>

    </main>
  </AppLayout>
</template>

<style scoped lang="scss">

// ── DayflowCalendar ──
.dayflow-cal {
  --cal-muted:  #f9f9fb;
  --cal-filled: #ffca2d;
  --cal-today:  #11a858;
  width: 100%;
  min-width: 0;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__month-label {
    border: none;
    background: none;
    font-weight: $font-sb;
    font-size: $font20;
    color: $title;
    cursor: default;
    padding: 0;
  }

  &__nav {
    display: flex;
    gap: 4px;
  }

  &__nav-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: $bg-color;
    color: $title;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  // ── 요일 행 ──
  &__dow {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 4px;
  }

  &__dow-cell {
    text-align: center;
    font-size: $font12;
    color: $text-disabled;
    padding: 4px 0;
    /*&:first-child { color: #fa5252; }
    &:last-child  { color: $primary; }*/
  }

  // ── 날짜 그리드 ──
  &__grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 10px;
    justify-items: center;
    width: 100%;
    min-width: 0;
  }

  &__day {
    position: relative;
    width: 100%;
    max-width: 38px;
    aspect-ratio: 1;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;

    &:disabled { cursor: default; }

    // 달 밖 빈 칸: 슬롯은 유지하고 시각만 숨김
    &--muted {
      visibility: hidden;
      pointer-events: none;
    }

    // 감정 기록 있는 날
    &--best, &--good, &--normal, &--bad, &--worst {
      .dayflow-cal__clover { background: var(--cal-filled); }
      .dayflow-cal__num    { color: $white; }
    }

    // 오늘
    &.is-today, &.is-selected {
      .dayflow-cal__clover { background: var(--cal-today); }
      .dayflow-cal__num    { color: $white; font-weight: $font-b; }
    }

    // 선택된 날: 클로버 외곽에 primary 테두리
    &.is-selected .dayflow-cal__clover::before {
      content: "";
      position: absolute;
      inset: -2px;
      background: $primary;
      -webkit-mask-image: url("/assets/img/main/day.svg");
      mask-image: url("/assets/img/main/day.svg");
      -webkit-mask-size: contain;
      mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      z-index: -1;
      pointer-events: none;
    }

    // 미래 날짜
    &--future {
      opacity: 0.3;
      cursor: default;
      pointer-events: none;
    }

    &:not(:disabled):hover .dayflow-cal__clover {
      transform: scale(1.06);
    }
  }

  &__clover {
    position: relative;
    width: 100%;
    height: 100%;
    flex-shrink: 0;
    background: var(--cal-muted);
    -webkit-mask-image: url("/assets/img/main/day.svg");
    mask-image: url("/assets/img/main/day.svg");
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    z-index: 0;
    transition: transform 0.15s ease;
  }

  &__num {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    transform: translateY(-50%);
    font-size: $font12;
    font-weight: $font-sb;
    color: #9395a1;
    text-align: center;
    line-height: 1;
  }
}

// ── 선택 날짜 기록 ──
.cal-divider {
  border: none;
  border-top: 1px solid $border;
  margin: 16px 0 12px;
}

.cal-record {
  &__date    { font-size: $font13; color: $text-sub; margin-bottom: 4px; }
  &__emotion { font-size: $font16; font-weight: $font-sb; color: $title; margin-bottom: 8px; }
  &__content {
    font-size: $font14;
    color: $text-default;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

// ── calendar-list ──
.calendar-list {
  h3 {
    font-size: $font16;
    font-weight: $font-sb;
    color: $title;
    margin-bottom: 12px;
    span { font-weight: $font-l; color: $text-disabled; margin-left: 4px; }
  }

  ul { list-style: none; padding: 0; margin: 0; }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 12px;
    background: $bg-color;
    cursor: pointer;
    transition: background 0.15s;
    &:hover { background: darken(#eef3fc, 4%); }

    em {
      flex-shrink: 0;
      font-style: normal;
      font-size: $font12;
      font-weight: $font-sb;
      padding: 4px 8px;
      border-radius: 20px;
      background: $white;
      color: $primary;
    }
  }
}

.calendar-list__summary {
  flex: 1;
  font-size: $font14;
  color: $text-default;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.calendar-list__empty {
  justify-content: center;
  flex-direction: column;
  text-align: center;
  font-size: $font14;
  color: $text-sub;
  gap: 6px;
  padding: 20px;

  &--action { cursor: pointer; }
}

.calendar-list__empty-cta {
  font-size: $font13;
  font-weight: $font-sb;
  color: $primary;
}

</style>
