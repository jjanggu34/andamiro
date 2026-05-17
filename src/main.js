import './assets/scss/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'

const app = createApp(App)

registerSW({ immediate: true })

app.use(createPinia())
app.use(router)

app.mount('#app')
