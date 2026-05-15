<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useAuthStore } from '@/stores/auth'

const router   = useRouter()
const route    = useRoute()
const exchange = useExchangeStore()
const auth     = useAuthStore()

const post        = ref(null)
const commentText = ref('')
const sending     = ref(false)
const loading     = ref(true)
const error       = ref('')

const myId = auth.user?.id

onMounted(async () => {
  const id = route.params.id
  post.value = await exchange.getById(id)
  await exchange.fetchComments(id)
  loading.value = false
})

function copyCode() {
  if (!post.value?.password) return
  navigator.clipboard.writeText(post.value.password)
  alert(`초대코드 복사됨: ${post.value.password}`)
}

async function submitComment() {
  const text = commentText.value.trim()
  if (!text) return
  sending.value = true
  error.value   = ''
  try {
    await exchange.addComment(route.params.id, text)
    commentText.value = ''
  } catch (e) {
    error.value = e?.message || '댓글 등록에 실패했어요.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <PageLayout title="교환일기" back-to="/exchange">
    <template #body>

      <div v-if="loading" class="detail-loading">불러오는 중…</div>

      <template v-else-if="post">
        <div class="detail-body">
          <!-- 본문 -->
          <section class="detail-post">
            <img v-if="post.image_url" :src="post.image_url" class="detail-post__img" alt="" />
            <h2 class="detail-post__title">{{ post.title }}</h2>
            <span class="detail-post__date">{{ post.created_at?.slice(0, 10) }}</span>
            <p class="detail-post__content">{{ post.content }}</p>
            <button v-if="post.user_id === myId && post.password" class="detail-invite-btn" @click="copyCode">
              초대코드 복사 · {{ post.password }}
            </button>
          </section>

          <!-- 댓글 목록 -->
          <section class="detail-comments">
            <h3 class="detail-comments__heading">댓글 {{ exchange.comments.length }}</h3>
            <ul class="detail-comment-list">
              <li v-if="!exchange.comments.length" class="detail-comment-empty">
                첫 번째 댓글을 남겨보세요.
              </li>
              <li
                v-for="c in exchange.comments"
                :key="c.id"
                class="detail-comment-item"
                :class="{ 'is-mine': c.user_id === myId }"
              >
                <p class="detail-comment-item__text">{{ c.content }}</p>
                <span class="detail-comment-item__date">{{ c.created_at?.slice(0, 16).replace('T', ' ') }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- 댓글 입력 -->
        <div class="detail-input-bar">
          <textarea
            v-model="commentText"
            class="detail-input"
            placeholder="댓글을 입력해 주세요"
            rows="1"
            @keydown.enter.prevent="submitComment"
          />
          <button class="detail-send" :disabled="sending || !commentText.trim()" @click="submitComment">
            전송
          </button>
        </div>
      </template>

      <div v-else class="detail-loading">게시글을 찾을 수 없어요.</div>

    </template>
  </PageLayout>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.detail-invite-btn {
  margin-top: 12px;
  width: 100%;
  padding: 12px;
  border: 1.5px dashed var(--primary);
  border-radius: 12px;
  background: rgba(66, 131, 243, 0.05);
  color: var(--primary);
  font-size: $font14;
  font-weight: $font-sb;
  letter-spacing: 2px;
  cursor: pointer;
  text-align: center;
}

.detail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: $text-disabled;
  font-size: $font14;
}

.detail-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 20px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 8px;
}

// 본문
.detail-post {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__img {
    width: 100%;
    max-height: 240px;
    object-fit: cover;
    border-radius: 16px;
    margin-bottom: 4px;
  }

  &__title {
    font-size: $font18;
    font-weight: $font-b;
    color: $title;
  }

  &__date {
    font-size: $font12;
    color: $text-disabled;
  }

  &__content {
    font-size: $font14;
    color: $text-default;
    line-height: 1.65;
    white-space: pre-wrap;
    background: $bg-color;
    border-radius: 12px;
    padding: 14px;
    margin-top: 4px;
  }
}

// 댓글
.detail-comments {
  &__heading {
    font-size: $font14;
    font-weight: $font-sb;
    color: $title;
    margin-bottom: 12px;
  }
}

.detail-comment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-comment-empty {
  font-size: $font13;
  color: $text-disabled;
  text-align: center;
  padding: 20px 0;
}

.detail-comment-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: flex-start;
  max-width: 80%;
  background: #f4f6fb;
  border-radius: 12px 12px 12px 0;
  padding: 10px 14px;

  &.is-mine {
    align-self: flex-end;
    background: $primary;
    border-radius: 12px 12px 0 12px;

    .detail-comment-item__text  { color: $white; }
    .detail-comment-item__date  { color: rgba(255,255,255,0.7); }
  }

  &__text {
    font-size: $font14;
    color: $title;
    line-height: 1.5;
  }

  &__date {
    font-size: 11px;
    color: $text-disabled;
  }
}

// 댓글 입력바
.detail-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid $border;
  background: $white;
  flex-shrink: 0;
}

.detail-input {
  flex: 1;
  min-height: 40px;
  max-height: 100px;
  padding: 9px 12px;
  border: 1px solid $border;
  border-radius: 20px;
  font-size: $font14;
  font-family: inherit;
  color: $title;
  resize: none;
  outline: none;
  line-height: 1.5;
  overflow-y: auto;

  &:focus { border-color: $primary; }
  &::placeholder { color: $text-disabled; }
}

.detail-send {
  height: 40px;
  padding: 0 16px;
  border-radius: 20px;
  background: $primary;
  color: $white;
  font-size: $font14;
  font-weight: $font-sb;
  border: none;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    background: $bg-color;
    color: $text-disabled;
  }
}
</style>
