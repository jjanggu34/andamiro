<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useAuthStore } from '@/stores/auth'

const router   = useRouter()
const exchange = useExchangeStore()
const auth     = useAuthStore()

async function handleDelete(e, id) {
  e.stopPropagation()
  if (!confirm('방을 삭제하면 댓글도 모두 삭제됩니다. 삭제할까요?')) return
  await exchange.deletePost(id)
}

const activeTab  = ref('all')
const tabs = [
  { key: 'all',    label: '전체' },
  { key: 'mine',   label: '내방' },
  { key: 'shared', label: '공유방' },
]

const showCodeInput = ref(false)
const codeInput     = ref('')
const codeError     = ref('')
const codeJoining   = ref(false)

async function joinByCode() {
  const code = codeInput.value.trim().toUpperCase()
  if (!code || codeJoining.value) return
  codeError.value  = ''
  codeJoining.value = true
  try {
    const { data } = await exchange.findPostByCode(code)
    if (!data) { codeError.value = '유효하지 않은 초대코드예요.'; return }
    const ok = await exchange.joinRoom(data.id, code)
    if (!ok) { codeError.value = '입장에 실패했어요.'; return }
    showCodeInput.value = false
    codeInput.value     = ''
    router.push(`/exchange/view/${data.id}`)
  } catch {
    codeError.value = '입장 중 오류가 발생했어요.'
  } finally {
    codeJoining.value = false
  }
}

watch(() => auth.user, async (u) => {
  if (!u) return
  await exchange.fetchPosts(activeTab.value)
}, { immediate: true })

watch(activeTab, (tab) => exchange.fetchPosts(tab))

function goToPost(id) {
  router.push(`/exchange/view/${id}`)
}
</script>

<template>
  <AppLayout title="교환일기">
    <div class="exch-wrap">
      <div class="exch-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="exch-tab"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <ul class="exch-posts">
        <li v-if="!exchange.posts.length" class="exch-empty">
          아직 작성된 교환일기가 없어요.
        </li>
        <li
          v-for="post in exchange.posts"
          :key="post.id"
          class="exch-item"
          @click="goToPost(post.id)"
        >
          <img v-if="post.image_url" :src="post.image_url" class="exch-item__thumb" alt="" />
          <div class="exch-item__body">
            <div class="exch-item__title-row">
              <strong class="exch-item__title">{{ post.title }}</strong>
              <div class="exch-item__badges">
                <span v-if="post.password" class="exch-item__lock">🔒</span>
                <span v-if="post._role === 'member'" class="exch-item__badge">공유</span>
                <button v-if="post._role === 'owner'" class="exch-item__delete" @click="handleDelete($event, post.id)">삭제</button>
              </div>
            </div>

            <!-- 최근 댓글 -->
            <div v-if="post.latest_comment" class="exch-item__latest">
              <span class="exch-item__latest-icon">💬</span>
              <p class="exch-item__latest-text">{{ post.latest_comment }}</p>
            </div>
            <p v-else class="exch-item__content">{{ post.content }}</p>

            <div class="exch-item__footer">
              <span class="exch-item__comment-count">💬 {{ post.comment_count }}</span>
              <span class="exch-item__date">{{ post.last_activity?.slice(0, 10) }}</span>
            </div>
          </div>
        </li>
      </ul>

      <!-- 초대코드 입장 패널 -->
      <div v-if="showCodeInput" class="exch-code-panel">
        <input
          v-model="codeInput"
          class="exch-code-input"
          type="text"
          placeholder="초대코드 6자리 입력"
          maxlength="20"
          @keydown.enter="joinByCode"
        />
        <button class="exch-code-confirm" :disabled="codeJoining" @click="joinByCode">
          {{ codeJoining ? '입장 중…' : '입장' }}
        </button>
        <p v-if="codeError" class="exch-code-error">{{ codeError }}</p>
      </div>

      <div class="exch-fabs">
        <button class="exch-fab exch-fab--code" @click="showCodeInput = !showCodeInput">🔑</button>
        <button class="exch-fab" @click="$router.push('/exchange/write')">+</button>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.exch-wrap {
  position: relative;
  padding: 0 20px 80px;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.exch-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 0 12px;
  position: sticky;
  top: 0;
  background: $white;
  z-index: 10;
}

.exch-tab {
  padding: 6px 16px;
  border-radius: 100px;
  border: 1px solid $border;
  font-size: $font14;
  color: $text-sub;
  cursor: pointer;
  background: $white;
  transition: all 0.15s;

  &.is-active {
    background: $primary;
    border-color: $primary;
    color: $white;
    font-weight: $font-sb;
  }
}

.exch-posts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.exch-empty {
  text-align: center;
  padding: 60px 0;
  color: $text-disabled;
  font-size: $font14;
}

.exch-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: $white;
  border: 1px solid $border;
  border-radius: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;

  &:active { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

  &__thumb {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__title {
    font-size: $font16;
    font-weight: $font-sb;
    color: $title;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badges {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    flex-shrink: 0;
  }

  &__lock { font-size: 13px; }

  &__delete {
    font-size: $font12;
    color: $white;
    background: #ff4d4f;
    border: none;
    border-radius: 100px;
    padding: 2px 8px;
    cursor: pointer;
  }

  &__badge {
    font-size: 11px;
    font-weight: $font-sb;
    color: $primary;
    background: rgba(66, 131, 243, 0.1);
    padding: 2px 6px;
    border-radius: 100px;
  }

  &__latest {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    background: $bg-color;
    border-radius: 8px;
    padding: 6px 10px;

    &-icon { font-size: 12px; flex-shrink: 0; margin-top: 1px; }

    &-text {
      font-size: $font13;
      color: $text-default;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2px;
  }

  &__comment-count {
    font-size: $font12;
    color: $primary;
    font-weight: $font-sb;
  }

  &__content {
    font-size: $font13;
    color: $text-sub;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__date {
    font-size: $font12;
    color: $text-disabled;
    margin-top: auto;
  }
}

.exch-fabs {
  position: fixed;
  bottom: calc(#{$tabbar-height} + 20px);
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.exch-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: $primary;
  color: $white;
  font-size: 28px;
  line-height: 1;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(66, 131, 243, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;

  &--code {
    font-size: 20px;
    background: $white;
    border: 1.5px solid $primary;
    color: $primary;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
}

.exch-code-panel {
  position: fixed;
  bottom: calc(#{$tabbar-height} + 140px);
  right: 20px;
  background: $white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 16px;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.exch-code-input {
  height: 44px;
  border: 1px solid $border;
  border-radius: 10px;
  padding: 0 12px;
  font-size: $font16;
  letter-spacing: 3px;
  font-weight: $font-sb;
  text-transform: uppercase;
  outline: none;
  &:focus { border-color: $primary; }
}

.exch-code-confirm {
  height: 44px;
  background: $primary;
  color: $white;
  border: none;
  border-radius: 10px;
  font-size: $font14;
  font-weight: $font-sb;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: default; }
}

.exch-code-error {
  font-size: $font13;
  color: #dc2626;
  text-align: center;
}
</style>
