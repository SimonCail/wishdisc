import { supabase } from './supabase'
import { t } from './i18n'

// --- Notifications sur le téléphone (Web Push) ---
// La clé publique VAPID vient de .env.local / Vercel (VITE_VAPID_PUBLIC_KEY).
// Sur iPhone, ça ne marche que si l'app est installée sur l'écran d'accueil (iOS 16.4 et plus).

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

// 'ok' | 'unsupported' | 'install' (iPhone : installer l'app d'abord) | 'not-configured'
export function pushAvailability() {
  if (!PUBLIC_KEY) return 'not-configured'
  if (isIOS() && !isStandalone()) return 'install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

export const permission = () => ('Notification' in window ? Notification.permission : 'default')

function keyToBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  // Le service worker n'existe qu'une fois l'app compilée (npm run build), pas en « npm run dev »
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, no) => setTimeout(() => no(new Error('no-sw')), 6000)),
  ])
  return reg
}

// L'abonnement actuel de cet appareil (ou null)
export async function currentSubscription() {
  if (pushAvailability() !== 'ok') return null
  try {
    const reg = await registration()
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

// À appeler depuis un appui sur un bouton (obligatoire sur iPhone)
export async function enablePush() {
  const state = pushAvailability()
  if (state !== 'ok') return { error: state }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { error: perm === 'denied' ? 'denied' : 'dismissed' }
  let reg
  try {
    reg = await registration()
  } catch {
    return { error: 'no-sw' }
  }
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) })
  }
  const json = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    sub_endpoint: json.endpoint,
    sub_p256dh: json.keys.p256dh,
    sub_auth: json.keys.auth,
    sub_agent: navigator.userAgent,
  })
  if (error) return { error: error.code === 'PGRST202' ? 'missing-table' : error.message }
  return {}
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return {}
  await supabase.rpc('remove_push_subscription', { sub_endpoint: sub.endpoint })
  await sub.unsubscribe()
  return {}
}

export function pushErrorMessage(code) {
  return (
    {
      denied: t('Les notifications sont bloquées. Autorise-les pour Wishdisc dans les réglages du téléphone.'),
      dismissed: t('Notifications non activées.'),
      install: t('Sur iPhone, installe d’abord l’app sur l’écran d’accueil (Partager → « Sur l’écran d’accueil »).'),
      unsupported: t('Ce navigateur ne gère pas les notifications.'),
      'not-configured': t('Notifications pas encore configurées (clé VAPID manquante).'),
      'no-sw': t('Les notifications ne marchent que sur l’app en ligne, pas en « npm run dev ».'),
      'missing-table': t('Lance d’abord le script 21-notifications.sql dans Supabase.'),
    }[code] || code
  )
}

// Pastille sur l'icône de l'app (nombre de choses non lues)
export function setAppBadge(count) {
  try {
    if (count > 0) navigator.setAppBadge?.(count)
    else navigator.clearAppBadge?.()
  } catch {
    // pas grave
  }
}
