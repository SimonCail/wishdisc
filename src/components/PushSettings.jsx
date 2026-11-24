import { useEffect, useState } from 'react'
import { btn } from '../lib/ui'
import { currentSubscription, disablePush, enablePush, permission, pushAvailability, pushErrorMessage } from '../lib/push'
import { CloseIcon } from './Icons'
import { t } from '../lib/i18n'

const BellIcon = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

// Cet appareil reçoit-il les notifications ? null = on ne sait pas encore
function usePushState() {
  const [on, setOn] = useState(null)
  useEffect(() => {
    let alive = true
    currentSubscription().then((s) => alive && setOn(!!s && permission() === 'granted'))
    return () => {
      alive = false
    }
  }, [])
  return [on, setOn]
}

// --- Dans le profil : interrupteur « Notifications sur ce téléphone » ---
export default function PushSettings({ onToast }) {
  const [on, setOn] = usePushState()
  const [busy, setBusy] = useState(false)
  const state = pushAvailability()

  async function toggle() {
    setBusy(true)
    const res = on ? await disablePush() : await enablePush()
    setBusy(false)
    if (res.error) return onToast(pushErrorMessage(res.error), 'error')
    setOn(!on)
    onToast(on ? t('Notifications désactivées sur cet appareil') : t('Notifications activées'))
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted"><BellIcon /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t('Sur ce téléphone')}</p>
        <p className="mt-0.5 text-sm text-muted">
          {state === 'ok'
            ? t('Messages, demandes d’ami et demandes pour rejoindre tes salons, même app fermée.')
            : pushErrorMessage(state)}
        </p>
      </div>
      {state === 'ok' && (
        <button
          role="switch"
          aria-checked={!!on}
          aria-label={t('Notifications sur cet appareil')}
          onClick={toggle}
          disabled={busy || on === null}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-line'}`}
        >
          <span
            className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`}
          />
        </button>
      )}
    </div>
  )
}

// --- Petite invitation (pages Messages et Amis), tant que ce n'est pas activé ---
const DISMISS_KEY = 'wishdisc-push-prompt-hidden'
export function PushPrompt({ onToast }) {
  const [on, setOn] = usePushState()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const state = pushAvailability()
  // Rien à proposer : déjà activé, refusé, masqué, ou pas possible ici
  if (hidden || on !== false || permission() === 'denied' || (state !== 'ok' && state !== 'install')) return null

  function hide() {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // pas grave
    }
  }
  async function enable() {
    const res = await enablePush()
    if (res.error) return onToast(pushErrorMessage(res.error), 'error')
    setOn(true)
    onToast(t('Notifications activées'))
  }

  return (
    <div className="animate-fade-up mx-auto mb-4 flex max-w-2xl items-center gap-3 rounded-2xl border border-line bg-surface p-3 pl-4">
      <span className="keep-day flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
        <BellIcon />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        {state === 'install'
          ? t('Pour être prévenu(e) des messages, installe Wishdisc sur l’écran d’accueil (Partager → « Sur l’écran d’accueil »).')
          : t('Sois prévenu(e) quand un ami t’écrit ou t’ajoute.')}
      </p>
      {state === 'ok' && (
        <button onClick={enable} className={`${btn.primary} shrink-0 px-4 py-2`}>{t('Activer')}</button>
      )}
      <button onClick={hide} aria-label={t('Ne plus proposer')} className={`${btn.icon} -mr-1 h-9 w-9`}>
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  )
}
