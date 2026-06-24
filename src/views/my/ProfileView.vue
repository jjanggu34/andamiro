<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import ProfileForm from '@/views/my/ProfileForm.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const openModal = inject('openModal')

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const form = reactive({
  nickname: '',
  ageGroup: '',
  gender: '',
})

const canSave = computed(() => (
  form.nickname.trim().length > 0 &&
  form.nickname.trim().length <= 10 &&
  !!form.ageGroup &&
  !!form.gender &&
  !saving.value
))

function applyProfile(profile) {
  form.nickname = profile?.nickname ?? ''
  form.ageGroup = profile?.age_group ?? ''
  form.gender = profile?.gender ?? ''
}

onMounted(async () => {
  try {
    if (!auth.profile) await auth.fetchProfile()
    applyProfile(auth.profile)
  } catch (fetchError) {
    console.error('[profile:fetch]', fetchError)
    error.value = '프로필 정보를 불러오지 못했어요.'
  } finally {
    loading.value = false
  }
})

async function saveProfile() {
  if (!canSave.value) return

  saving.value = true
  error.value = ''
  try {
    await auth.updateProfile({
      nickname: form.nickname.trim(),
      age_group: form.ageGroup,
      gender: form.gender,
    })

    if (openModal) {
      openModal({
        title: '프로필이 수정되었습니다',
        btnLabel: '확인',
        onConfirm: () => router.replace('/my'),
      })
    } else {
      await router.replace('/my')
    }
  } catch (saveError) {
    console.error('[profile:update]', saveError)
    error.value = saveError?.message || '프로필 저장에 실패했어요.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageLayout title="프로필 수정" back-to="/my" body-class="profile-edit-page">
    <template #body>
      <main class="profile-edit-page__main">
        <p v-if="loading" class="profile-edit-page__status">프로필을 불러오는 중...</p>
        <template v-else>
          <ProfileForm
            v-model:nickname="form.nickname"
            v-model:age-group="form.ageGroup"
            v-model:gender="form.gender"
            show-labels
            id-prefix="profileEdit"
          />
          <p v-if="error" class="profile-edit-page__error" role="alert">{{ error }}</p>
        </template>
      </main>
    </template>
    <template #footer>
      <FooterCtp
        :label="saving ? '저장 중...' : '저장'"
        :disabled="loading || !canSave"
        @click="saveProfile"
      />
    </template>
  </PageLayout>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.profile-edit-page__main {
  padding: 24px 20px;
}

.profile-edit-page__status,
.profile-edit-page__error {
  font-size: $font14;
  text-align: center;
}

.profile-edit-page__status { color: $text-sub; }
.profile-edit-page__error { margin-top: 16px; color: #dc2626; }
</style>
