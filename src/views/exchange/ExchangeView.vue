<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import TabMenu from '@/components/layout/TabMenu.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useAuthStore } from '@/stores/auth'

const router   = useRouter()
const route    = useRoute()
const exchange = useExchangeStore()
const auth     = useAuthStore()

async function handleDelete(e, id) {
  e.stopPropagation()
  if (!confirm('방을 삭제하면 댓글도 모두 삭제됩니다. 삭제할까요?')) return
  await exchange.deletePost(id)
}
const activeTab = ref('mine')
const tabs = [
  { key: 'mine',   label: '내가 공유한' },
  { key: 'shared', label: '공유 받은' },
]

const joinPost      = ref(null)
const inviteToken   = ref('')
const joinPw        = ref('')
const showJoinPw    = ref(false)
const joinError     = ref('')
const joinLoading   = ref(false)

async function handleJoin() {
  if (!inviteToken.value || joinLoading.value) return
  joinError.value   = ''
  joinLoading.value = true
  try {
    const postId = await exchange.acceptInvitation(inviteToken.value, joinPw.value)
    if (postId === false) { joinError.value = '비밀번호가 틀렸어요.'; return }
    joinPost.value  = null
    inviteToken.value = ''
    joinPw.value    = ''
    router.push(`/exchange/view/${postId}`)
  } catch (e) {
    joinError.value = e?.message || '입장 중 오류가 발생했어요.'
  } finally {
    joinLoading.value = false
  }
}

watch(() => auth.user, async (u) => {
  if (!u) return
  await exchange.fetchPosts('all')
}, { immediate: true })

onMounted(async () => {
  const token = route.query.invite
  if (!token) return
  try {
    const preview = await exchange.getInvitationPreview(token)
    if (!preview?.post) {
      joinError.value = '유효하지 않은 초대 링크예요.'
      joinPost.value  = { title: '초대 오류' }
      return
    }
    inviteToken.value = token
    joinPost.value    = preview.post
  } catch {
    joinError.value = '초대 정보를 불러오지 못했어요.'
    joinPost.value  = { title: '초대 오류' }
  }
})


function goToPost(id) {
  router.push(`/exchange/view/${id}`)
}
</script>

<template>
  <PageLayout title="교환일기" back-to="/main">
    <template #body>
      <main class="exch-body">
        <TabMenu v-model="activeTab" :tabs="tabs" />
        <section class="list-content">
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
        </section>



        <!-- 비밀번호 입장 모달 -->
        <div v-if="joinPost" class="exch-pw-overlay" @click.self="joinPost = null">
          <div class="exch-pw-modal">
            <strong class="exch-pw-title">{{ joinPost.title }}</strong>
            <template v-if="inviteToken">
              <p class="exch-pw-desc">비밀번호를 입력해 주세요</p>
              <div class="exch-pw-wrap">
                <input
                  v-model="joinPw"
                  class="exch-pw-input"
                  :type="showJoinPw ? 'text' : 'password'"
                  placeholder="비밀번호"
                  autofocus
                  @keydown.enter="handleJoin"
                />
                <button type="button" class="exch-pw-eye" @click="showJoinPw = !showJoinPw">
                  <svg v-if="showJoinPw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <button class="exch-pw-confirm" :disabled="joinLoading" @click="handleJoin">
                {{ joinLoading ? '입장 중…' : '방 입장하기' }}
              </button>
            </template>
            <p v-if="joinError" class="exch-pw-error">{{ joinError }}</p>
            <button class="exch-pw-close" @click="joinPost = null">닫기</button>
          </div>
        </div>

        <div class="exch-fabs">
          <button class="exch-fab" @click="$router.push('/exchange/write')">+</button>
        </div>
      </main>
    </template>
    <template #footer>
      <AppTabBar />
    </template>
  </PageLayout>
</template>


<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.exch-body {
  position: relative;
  padding: 0 20px 80px;
  height: 100%;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background:#F5F6F8;
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

}

.exch-pw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.exch-pw-modal {
  background: $white;
  border-radius: 20px;
  padding: 28px 24px 24px;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exch-pw-title {
  font-size: $font16;
  font-weight: $font-sb;
  color: $title;
  text-align: center;
  word-break: keep-all;
}

.exch-pw-desc {
  font-size: $font13;
  color: $text-sub;
  text-align: center;
  margin-top: -4px;
}

.exch-pw-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.exch-pw-eye {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: $text-disabled;
  display: flex;
  align-items: center;

  svg { width: 20px; height: 20px; }
  &:hover { color: $text-sub; }
}

.exch-pw-input {
  flex: 1;
  height: 48px;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 0 44px 0 14px;
  font-size: $font16;
  font-family: inherit;
  outline: none;
  &:focus { border-color: $primary; }
  &::placeholder { color: $text-disabled; }
}

.exch-pw-confirm {
  height: 48px;
  background: $primary;
  color: $white;
  border: none;
  border-radius: 12px;
  font-weight: $font-sb;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: default; }
}

.exch-pw-error {
  font-size: $font13;
  color: #dc2626;
  text-align: center;
  margin-top: -4px;
}

.exch-pw-close {
  background: none;
  border: none;
  font-size: $font13;
  color: $text-disabled;
  cursor: pointer;
  padding: 4px 0;
}
</style>
