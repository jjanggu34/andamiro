<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title:      { type: String,  default: '' },
  backTo:     { type: String,  default: '' },
  actionLabel:{ type: String,  default: '' },
  bodyClass:  { type: String,  default: '' },
  hideHeader: { type: Boolean, default: false },
  hideBack:   { type: Boolean, default: false },
})

const emit = defineEmits(['action'])
const router = useRouter()

function goBack() {
  if (props.backTo) router.push(props.backTo)
  else router.back()
}
</script>

<template>
  <div class="wrap">
    <div v-if="!hideHeader" id="headerWrap">
      <header id="header" class="header">
        <button v-if="!hideBack" class="header__back" @click="goBack" aria-label="뒤로">
          <span class="header__back-icon" />
        </button>
        <span v-else class="header__back" />

        <h1 class="header__title">
          <span>{{ title }}</span>
        </h1>

        <div class="header__right">
          <slot name="action">
            <button
              v-if="actionLabel"
              class="header__action"
              @click="emit('action')"
            >
              {{ actionLabel }}
            </button>
          </slot>
        </div>
      </header>
    </div>

    <div id="bodyWrap" :class="bodyClass">
      <slot name="body">
        <main>
          <slot />
        </main>
      </slot>
      <slot name="footer" />
    </div>
  </div>
</template>