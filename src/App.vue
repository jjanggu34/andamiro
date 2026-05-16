<script setup>
import { ref, provide, computed } from 'vue'
import ModalBottom from '@/components/layout/modalBottom.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const appReady  = computed(() => !authStore.loading)

const modalShow    = ref(false)
const modalOptions = ref({})

function openModal(options = {}) {
  modalOptions.value = options
  modalShow.value    = true
}
function closeModal() {
  modalShow.value = false
  modalOptions.value.onClose?.()
}
function confirmModal() {
  modalShow.value = false
  modalOptions.value.onConfirm?.()
}

provide('openModal',  openModal)
provide('closeModal', closeModal)
</script>

<template>
  <div v-if="!appReady" class="app-loading">
    <div class="app-loading__inner">
      <img src="/assets/img/main/img-splash.gif" alt="안다미로" />
    </div>
  </div>
  <template v-else>
    <RouterView />
    <ModalBottom
      :show="modalShow"
      :icon="modalOptions.icon"
      :title="modalOptions.title"
      :description="modalOptions.description"
      :btn-label="modalOptions.btnLabel"
      @close="closeModal"
      @confirm="confirmModal"
    />
  </template>
</template>

<style>
.app-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.app-loading__inner img {
  width: 200px;
  height: auto;
}
</style>
