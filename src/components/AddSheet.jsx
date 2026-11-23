import { useEffect, useRef, useState } from 'react'
import SearchPanel, { BarcodeIcon } from './SearchPanel'
import { CloseIcon, PlusIcon } from './Icons'

// --- Téléphone : bouton « + » et panneau « Ajouter un disque » ---
// Les trois façons d'ajouter un disque au même endroit : chercher, scanner, importer.

const CLOSE_DISTANCE = 110 // px à descendre pour fermer
const CLOSE_SPEED = 0.5 // ou un geste rapide (px/ms)

// La partie de l'écran vraiment visible (sans le clavier).
// Sur iPhone, le clavier passe PAR-DESSUS la page et fait glisser l'écran : on cale donc
// le panneau sur cette zone visible, pour qu'il reste entier au-dessus du clavier.
function useVisibleArea() {
  const read = () => {
    const vv = window.visualViewport
    if (!vv || !vv.height) return { top: 0, height: window.innerHeight, keyboard: false }
    return { top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 }
  }
  const [area, setArea] = useState(read)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setArea(read())
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return area
}

const ImportIcon = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
)

// Bouton rond posé au-dessus des onglets du bas
export function AddFab({ onClick, disabled }) {
  return (
    <button
      data-tour="add"
      onClick={onClick}
      disabled={disabled}
      aria-label="Ajouter un disque"
      title={disabled ? 'Indisponible hors-ligne' : 'Ajouter un disque'}
      className="fab-in fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-ink shadow-[0_12px_28px_-8px_rgba(0,0,0,0.5)] transition active:scale-95 disabled:opacity-60 md:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <PlusIcon width={26} height={26} />
    </button>
  )
}

function Option({ icon, title, text, onClick, disabled, dark = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl border border-line p-3.5 text-left transition hover:border-accent active:bg-raised disabled:opacity-50"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          dark ? 'bg-paper text-ink' : 'bg-accent text-ink'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
    </button>
  )
}

// seed : recherche à lancer dès l'ouverture (texte tapé par erreur dans le filtre de la liste)
export default function AddSheet({ statusOf, onAdd, onGotIt, onError, onScan, onImport, offline, seed, onClose }) {
  const [dy, setDy] = useState(0) // de combien le panneau est descendu
  const [closing, setClosing] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Hauteur : celle du contenu, ou presque tout l'écran avec des résultats
  // ou le clavier ouvert (le champ reste ainsi en haut, au-dessus du clavier)
  const [hasResults, setHasResults] = useState(false)
  const area = useVisibleArea()
  const tall = hasResults || area.keyboard
  const drag = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  function close(then) {
    setClosing(true)
    setTimeout(() => {
      onCloseRef.current()
      then?.()
    }, 220) // le temps de le voir descendre
  }

  // --- Glisser vers le bas (depuis la petite barre et le titre) ---
  function onPointerDown(e) {
    if (e.target.closest('button')) return
    const now = performance.now()
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: now, speed: 0 }
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pas grave : on suit quand même le geste
    }
  }
  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    const now = performance.now()
    d.speed = (e.clientY - d.lastY) / Math.max(1, now - d.lastT)
    d.lastY = e.clientY
    d.lastT = now
    setDy(Math.max(0, e.clientY - d.startY))
  }
  function onPointerUp() {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    if (dy > CLOSE_DISTANCE || (d.speed > CLOSE_SPEED && dy > 10)) close()
    else setDy(0)
  }

  const shift = closing ? '100%' : `${dy}px`
  const fade = closing ? 0 : Math.max(0.15, 1 - dy / 400)

  // Ce qu'on voit sous le champ avant de chercher
  const options = (
    <div className="mt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Ou bien</p>
      <div className="flex flex-col gap-2.5">
        <Option
          icon={<BarcodeIcon width={22} height={22} />}
          title="Scanner une pochette"
          text="Le code-barres au dos du disque"
          disabled={offline}
          onClick={() => close(onScan)}
        />
        <Option
          icon={<ImportIcon />}
          title="Importer depuis Discogs"
          text="Ta wantlist ou ta collection, d’un coup"
          disabled={offline}
          dark
          onClick={() => close(onImport)}
        />
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-x-0 z-50 flex items-end md:hidden"
      style={{ top: area.top, height: area.height }}
    >
      <div
        aria-hidden="true"
        onClick={() => close()}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: fade, transition: dragging ? 'none' : 'opacity 220ms ease' }}
      />
      <div className="sheet-up relative w-full">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un disque"
          className="flex w-full flex-col rounded-t-3xl bg-surface shadow-2xl"
          style={{
            // Avec le clavier : toute la zone visible (le champ en haut, les résultats juste au-dessus du clavier)
            ...(area.keyboard
              ? { height: area.height - 8 }
              : tall
                ? { height: Math.round(area.height * 0.9) }
                : { maxHeight: Math.round(area.height * 0.9) }),
            transform: `translateY(${shift})`,
            transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Zone pour attraper le panneau : la petite barre et le titre */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="shrink-0 cursor-grab touch-none px-5 pb-4 pt-3 active:cursor-grabbing"
          >
            <span aria-hidden="true" className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl font-black uppercase leading-none">Ajouter un disque</h2>
              <button
                onClick={() => close()}
                aria-label="Fermer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-paper"
              >
                <CloseIcon width={20} height={20} />
              </button>
            </div>
          </div>

          <div className="nice-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <SearchPanel
              embedded
              statusOf={statusOf}
              onAdd={onAdd}
              onGotIt={onGotIt}
              onError={onError}
              offline={offline}
              seed={seed}
              idle={options}
              onResults={setHasResults}
            />
          </div>
        </div>
      </div>
    </div>
  )
}