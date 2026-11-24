import { useEffect } from 'react'
import ComingSoon from './ComingSoon'
import { CloseIcon } from './Icons'
import { btn } from '../lib/ui'
import { t } from '../lib/i18n'

// « Sorties » : le calendrier des albums de mes artistes, dans un panneau (ouvert depuis le profil)
export default function ReleasesSheet({ myItems, online, onAdd, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Sorties')}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop nice-scroll relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <button onClick={onClose} aria-label={t('Fermer')} className={`${btn.icon} absolute right-3 top-3`}>
          <CloseIcon width={18} height={18} />
        </button>
        <ComingSoon myItems={myItems} online={online} onAdd={onAdd} />
      </div>
    </div>
  )
}