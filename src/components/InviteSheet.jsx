import { useEffect, useState } from 'react'
import { btn } from '../lib/ui'
import { copyToClipboard } from '../lib/share'
import { CloseIcon, CopyIcon, ShareIcon } from './Icons'
import { t } from '../lib/i18n'

// Inviter dans un salon sans taper de code :
// un QR code à scanner quand on est ensemble, ou le lien à envoyer (WhatsApp, Messages…).
// Dans tous les cas, la personne envoie une demande que le responsable accepte.
export default function InviteSheet({ room, url, onClose, onToast }) {
  const [qr, setQr] = useState(null) // le QR code, en SVG (fabriqué sur le téléphone, rien n'est envoyé)

  useEffect(() => {
    let alive = true
    import('qrcode')
      .then((QR) =>
        QR.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1b2420', light: '#ffffff' } })
      )
      .then((svg) => alive && setQr(svg))
      .catch(() => alive && setQr(''))
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyCode() {
    const ok = await copyToClipboard(room.code)
    onToast(ok ? t('Code copié') : t('Code du salon : {code}', { code: room.code }))
  }

  async function share() {
    const text = t('Rejoins mon salon « {name} » sur Wishdisc pour partager nos listes de vinyles (code {code}).', { name: room.name, code: room.code })
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Wishdisc', text, url })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return // partage annulé par la personne
      }
    }
    const ok = await copyToClipboard(url)
    onToast(ok ? t('Lien d\'invitation copié, envoie-le à qui tu veux') : url, ok ? 'success' : 'error')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Inviter dans « {name} »', { name: room.name })}
        className="sheet-up max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-surface px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-black uppercase leading-[0.95]">{t('Inviter dans')}<br />« {room.name} »
          </h2>
          <button onClick={onClose} aria-label={t('Fermer')} className={`${btn.icon} -mr-2 -mt-1`}>
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        {/* QR code : toujours noir sur blanc, pour que l'appareil photo le lise bien */}
        <div className="mx-auto mt-5 flex h-52 w-52 items-center justify-center rounded-3xl border border-line bg-white p-4">
          {qr ? (
            <div
              className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
              role="img"
              aria-label={t('QR code pour rejoindre « {name} »', { name: room.name })}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          ) : qr === null ? (
            <span className="h-full w-full animate-pulse rounded-xl bg-black/5" aria-hidden="true" />
          ) : (
            <span className="text-center text-xs text-black/60">{t('QR code indisponible, utilise le lien.')}</span>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted">{t('À scanner avec l’appareil photo, à côté de toi')}</p>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-raised/50 py-2 pl-4 pr-2">
          <span className="font-mono text-xl font-bold tracking-[0.2em]">{room.code}</span>
          <button onClick={copyCode} className={btn.quiet}>
            <CopyIcon width={14} height={14} />{' '}{t('Copier')}</button>
        </div>

        <button onClick={share} className={`${btn.primary} mt-4 w-full py-3 text-base`}>
          <ShareIcon width={18} height={18} />{' '}{t('Envoyer le lien…')}</button>
        <p className="mt-3 text-center text-xs text-muted">{t('La personne t’envoie une demande : personne n’entre sans l’accord du responsable.')}</p>
      </div>
    </div>
  )
}
