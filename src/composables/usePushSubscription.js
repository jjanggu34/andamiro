import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushSubscription() {
  async function subscribe(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window))
      throw new Error('푸시를 지원하지 않는 브라우저예요.')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted')
      throw new Error('알림 권한이 거부되었어요. 브라우저 설정에서 허용해 주세요.')

    // 타임아웃을 15초로 늘리고 실패 시 명확한 메시지 제공
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('서비스워커 준비 시간이 초과됐어요. 페이지를 새로고침 후 다시 시도해 주세요.')), 15000)
      ),
    ])

    const existing = await registration.pushManager.getSubscription()
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { endpoint, keys } = subscription.toJSON()

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'user_id,endpoint' }
    )
    if (error) throw new Error('구독 저장에 실패했어요.')
  }

  async function unsubscribe(userId) {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
  }

  return { subscribe, unsubscribe }
}
