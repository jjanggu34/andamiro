<script setup>
import { ref, provide } from 'vue'
import ModalBottom from '@/components/layout/modalBottom.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

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
