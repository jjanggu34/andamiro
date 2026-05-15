<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import { useExchangeStore } from '@/stores/exchange'

const router   = useRouter()
const exchange = useExchangeStore()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif']

const imageFile    = ref(null)
const imagePreview = ref('')
const title        = ref('')
const content      = ref('')
const password     = ref('')
const saving       = ref(false)
const error        = ref('')

onMounted(() => {
  content.value = history.state?.summary ?? ''
})

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!ALLOWED_TYPES.includes(file.type)) {
    error.value = 'jpg, png, gif 파일만 등록할 수 있어요.'
    e.target.value = ''
    return
  }
  error.value = ''
  imageFile.value    = file
  imagePreview.value = URL.createObjectURL(file)
}

function removeImage() {
  imageFile.value    = null
  imagePreview.value = ''
}

async function onSave() {
  error.value = ''
  if (!title.value.trim())   { error.value = '제목을 입력해 주세요.';   return }
  if (!content.value.trim()) { error.value = '내용을 입력해 주세요.';   return }

  saving.value = true
  try {
    await exchange.save({
      title:     title.value.trim(),
      content:   content.value.trim(),
      imageFile: imageFile.value,
      password:  password.value.trim() || null,
    })
    router.replace('/exchange')
  } catch (e) {
    error.value = e?.message || '저장에 실패했어요.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageLayout title="교환일기 작성" back-to="/exchange">
    <template #body>
      <div class="write-body">

        <!-- 이미지 업로드 -->
        <div class="write-field">
          <label class="write-label">이미지</label>
          <div v-if="imagePreview" class="write-img-preview">
            <img :src="imagePreview" alt="미리보기" />
            <button type="button" class="write-img-remove" @click="removeImage">✕</button>
          </div>
          <label v-else class="write-img-add">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif"
              class="write-file-input"
              @change="onFileChange"
            />
            <span class="write-img-add__icon">+</span>
            <span class="write-img-add__text">사진 추가<br><small>jpg · png · gif</small></span>
          </label>
        </div>

        <!-- 제목 -->
        <div class="write-field">
          <label class="write-label" for="write-title">내방 제목</label>
          <input
            id="write-title"
            v-model="title"
            class="write-input"
            type="text"
            placeholder="제목을 입력해 주세요"
            maxlength="60"
          />
        </div>

        <!-- 채팅 요약 -->
        <div class="write-field">
          <label class="write-label" for="write-content">채팅 요약</label>
          <textarea
            id="write-content"
            v-model="content"
            class="write-textarea"
            placeholder="오늘의 채팅 내용을 요약해 주세요"
            rows="6"
          />
        </div>

        <!-- 비밀번호 -->
        <div class="write-field">
          <label class="write-label" for="write-password">비밀번호 <span class="write-label--opt">(선택)</span></label>
          <input
            id="write-password"
            v-model="password"
            class="write-input"
            type="password"
            placeholder="비밀번호로 방을 공유할 수 있어요"
            maxlength="20"
          />
        </div>

        <p v-if="error" class="write-error" role="alert">{{ error }}</p>
      </div>

      <FooterCtp
        :label="saving ? '저장 중…' : '저장'"
        :disabled="saving"
        @click="onSave"
      />
    </template>
  </PageLayout>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.write-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.write-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.write-label {
  font-size: $font14;
  font-weight: $font-sb;
  color: $title;
}

.write-label--opt {
  font-size: $font13;
  font-weight: $font-l;
  color: $text-disabled;
}

.write-input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid $border;
  border-radius: 12px;
  font-size: $font16;
  font-family: inherit;
  color: $title;
  background: $white;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: $primary; }
  &::placeholder { color: $text-disabled; }
}

.write-textarea {
  padding: 12px 14px;
  border: 1px solid $border;
  border-radius: 12px;
  font-size: $font14;
  font-family: inherit;
  color: $title;
  background: $white;
  resize: none;
  outline: none;
  line-height: 1.6;
  transition: border-color 0.15s;

  &:focus { border-color: $primary; }
  &::placeholder { color: $text-disabled; }
}

// 이미지 업로드
.write-img-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100px;
  height: 100px;
  border: 1.5px dashed $border;
  border-radius: 12px;
  cursor: pointer;
  background: $bg-color;

  &__icon {
    font-size: 24px;
    color: $text-disabled;
    line-height: 1;
  }

  &__text {
    font-size: $font12;
    color: $text-disabled;
    text-align: center;
    line-height: 1.4;

    small { font-size: 10px; }
  }
}

.write-file-input { display: none; }

.write-img-preview {
  position: relative;
  width: 100px;
  height: 100px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }
}

.write-img-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: $title;
  color: $white;
  font-size: 11px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.write-error {
  font-size: $font13;
  color: #dc2626;
  padding: 4px 2px;
}
</style>
