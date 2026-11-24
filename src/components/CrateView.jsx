import { useEffect, useRef, useState } from 'react'
import Cover from './Cover'
import { CloseIcon, StarIcon } from './Icons'
import { t } from '../lib/i18n'

// « Fouiller le bac » : on feuillette ses disques un par un, comme chez un disquaire.
// La pochette du dessus en grand, les suivantes inclinées derrière.
// Glisser vers le haut (ou flèche droite / bas) : disque suivant ; vers le bas : précédent.
const BEHIND = 3 // pochettes visibles derrière
const SWIPE = 60 // px pour changer de disque

export default function CrateView({ items, mode, onOpen, onClose }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1) // sens de l'animation
  const [drag, setDrag] = useState(0)
  const start = useRef(null)
  const count = items.length
  const i = Math.min(index, count - 1)
  const v = items[i]

  function go(step) {
    if (!count) return
    setDir(step)
    setIndex((n) => (n + step + count) % count)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1)
      else if (e.key === 'Enter' && v) onOpen(v.key)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  })

  if (!v) return null
  const behind = Array.from({ length: Math.min(BEHIND, count - 1) }, (_, k) => items[(i + k + 1) % count])

  const onDown = (e) => {
    start.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (start.current == null) return
    setDrag(Math.max(-160, Math.min(160, e.clientY - start.current)))
  }
  const onUp = () => {
    if (start.current == null) return
    if (drag < -SWIPE) go(1)
    else if (drag > SWIPE) go(-1)
    start.current = null
    setDrag(0)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Fouiller le bac')}
      className="keep-day fixed inset-0 z-[38] flex flex-col bg-[#2a2118] text-[#f5efe3]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 pt-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em]">
          {mode === 'wish' ? t('Fouiller mes souhaits') : t('Fouiller ma collection')}
        </p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#b8a890]">
            {i + 1} / {count}
          </span>
          <button onClick={onClose} aria-label={t('Fermer')} className="rounded-full p-2 transition hover:bg-white/10">
            <CloseIcon width={20} height={20} />
          </button>
        </div>
      </div>

      {/* Le bac */}
      <div
        className="relative flex min-h-0 flex-1 touch-none select-none flex-col items-center justify-center"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="relative mt-16 w-[min(70vw,21rem)]" style={{ perspective: '900px' }}>
          {/* Les suivantes, inclinées derrière */}
          {behind
            .slice()
            .reverse()
            .map((b, k) => {
              const depth = behind.length - k // 3, 2, 1
              return (
                <div
                  key={`${b.key}-${depth}`}
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 transition-transform duration-300"
                  style={{
                    transform: `translateY(${-(20 + depth * 13)}%) rotateX(32deg) scale(${1 - depth * 0.07})`,
                    transformOrigin: '50% 100%',
                    filter: `brightness(${1 - depth * 0.18})`,
                  }}
                >
                  <Cover url={b.cover_url} className="aspect-square w-full rounded-md shadow-[0_-6px_14px_rgba(0,0,0,0.35)]" />
                </div>
              )
            })}
          {/* La pochette du dessus */}
          <button
            key={v.key}
            onClick={() => Math.abs(drag) < 5 && onOpen(v.key)}
            aria-label={t('Ouvrir {title}', { title: v.title })}
            className={`relative block w-full ${dir > 0 ? 'crate-next' : 'crate-prev'}`}
            style={{ transform: `translateY(${drag}px) rotate(${-2 + drag / 60}deg)`, transition: drag ? 'none' : 'transform 0.3s' }}
          >
            <Cover url={v.cover_url} className="aspect-square w-full rounded-md shadow-[0_34px_50px_-20px_rgba(0,0,0,0.85)]" />
          </button>
        </div>

        <div className="mt-8 max-w-[85vw] text-center">
          <p className="truncate font-display text-2xl font-black">{v.title}</p>
          <p className="truncate text-sm text-[#b8a890]">
            {v.artist}
            {v.year ? ` · ${v.year}` : ''}
          </p>
          {mode === 'wish' && v.priority > 0 && (
            <p className="mt-2 flex justify-center text-[#f1c04e]" aria-label={t('Envie {priority} sur 3', { priority: v.priority })}>
              {Array.from({ length: v.priority }).map((_, k) => (
                <StarIcon key={k} filled width={16} height={16} />
              ))}
            </p>
          )}
        </div>
        <p className="mt-6 text-xs text-[#8f8270]">{t('Glisse vers le haut pour passer au disque suivant')}</p>
      </div>

      <div className="flex items-center justify-center gap-3 px-4 pb-6 pt-2">
        <button onClick={() => go(-1)} aria-label={t('Disque précédent')} className="h-12 w-12 rounded-full bg-white/10 text-2xl transition hover:bg-white/20">
          ‹
        </button>
        <button onClick={() => onOpen(v.key)} className="h-12 rounded-full bg-[#f1c04e] px-6 text-sm font-bold text-[#1b2420] transition hover:brightness-105">
          {t('Ouvrir la fiche')}
        </button>
        <button onClick={() => go(1)} aria-label={t('Disque suivant')} className="h-12 w-12 rounded-full bg-white/10 text-2xl transition hover:bg-white/20">
          ›
        </button>
      </div>
    </div>
  )
}
