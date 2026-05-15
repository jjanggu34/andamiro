import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',             name: 'splash',    component: () => import('@/views/SplashView.vue') },
    { path: '/login',        name: 'login',     component: () => import('@/views/login/LoginView.vue') },
    { path: '/join/1',       name: 'join-1',    component: () => import('@/views/login/JoinStep1View.vue') },
    { path: '/join/2',       name: 'join-2',    component: () => import('@/views/login/JoinStep2View.vue') },
    { path: '/join/3',       name: 'join-3',    component: () => import('@/views/login/JoinStep3View.vue') },
    { path: '/join/4',       name: 'join-4',    component: () => import('@/views/login/JoinStep4View.vue') },
    {
      path: '/main',         name: 'main',      component: () => import('@/views/main/MainView.vue'),      meta: { requiresAuth: true },
    },
    {
      path: '/chat',         name: 'chat',      component: () => import('@/views/chat/ChatView.vue'), meta: { requiresAuth: true },
    },
    {
      path: '/chat/emotion', name: 'emotion',   component: () => import('@/views/chat/EmotionView.vue'), meta: { requiresAuth: true },
    },
    {
      path: '/chat/result',  name: 'result',    component: () => import('@/views/chat/ResultView.vue'),  meta: { requiresAuth: true },
    },
    {
      path: '/advice',       name: 'advice',    component: () => import('@/views/advice/AdviceView.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/report',       name: 'report',    component: () => import('@/views/report/ReportView.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/exchange',          name: 'exchange',       component: () => import('@/views/exchange/ExchangeView.vue'), meta: { requiresAuth: true },
    },
    {
      path: '/exchange/write',    name: 'exchange-write', component: () => import('@/views/exchange/WriteView.vue'),    meta: { requiresAuth: true },
    },
    {
      path: '/exchange/view/:id', name: 'exchange-view',  component: () => import('@/views/exchange/DetailView.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/exchange/room',     name: 'room',           component: () => import('@/views/exchange/RoomView.vue'),     meta: { requiresAuth: true },
    },
    {
      path: '/my',           name: 'my',        component: () => import('@/views/my/MyView.vue'),     meta: { requiresAuth: true },
    },
    {
      path: '/my/chat-view', name: 'chat-view', component: () => import('@/views/my/ChatViewView.vue'), meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.loading) await auth.init(to.query.code ?? null)

  // OAuth 콜백 code 파라미터 제거
  if (to.query.code) return { path: to.path, query: {} }

  const joinPaths = ['/join/1', '/join/2', '/join/3', '/join/4']

  // 비로그인 → 보호 라우트 접근 차단
  if (to.meta.requiresAuth && !auth.user) return '/login'

  // 로그인 상태
  if (auth.user) {
    const isNew = auth.isNewUser()

    // 신규 유저 → join 플로우로
    if (isNew && !joinPaths.includes(to.path)) return '/join/1'

    // 기존 유저 → 로그인/join 페이지 접근 차단
    if (!isNew && (to.path === '/' || to.path === '/login' || joinPaths.includes(to.path))) return '/main'
  }
})

export default router
