import { useEffect, useRef, useState } from 'react'
import { btn } from '../lib/ui'
import { BrandMark } from './Layout'
import { StarIcon } from './Icons'

// --- Visite guidée du premier lancement ---
// Le reste de l'écran est grisé, la lumière passe d'un élément à l'autre.
// Le disque, le salon et l'amie de la visite sont des faux : rien n'est enregistré
// (le disque de démo n'existe que dans l'app, le salon et la conversation que dans ce fichier).

const DEMO_CODE = 'DEMO-01'
const WANDA = { name: 'Wanda', color: '#f1c04e' }

// Étapes : 'modal' (fenêtre au centre), 'spot' (lumière sur un élément), 'screen' (faux écran)
const STEPS = [
  { kind: 'modal', id: 'welcome' },
  {
    kind: 'spot', target: 'add', part: 1, section: 'home', clickTarget: true,
    title: 'Ajoute un disque',
    text: 'Le bouton + sert à chercher un album, scanner une pochette ou importer Discogs. Touche-le !',
  },
  {
    kind: 'spot', target: 'demo-card', part: 1, section: 'home', scroll: true,
    title: 'Le voilà dans tes souhaits',
    text: 'Mets-lui des étoiles selon ton envie. Quand tu l’as enfin, « Je l’ai » le range dans ta collection.',
  },
  {
    kind: 'spot', target: 'join', part: 2, section: 'rooms', scroll: true,
    title: 'Les salons',
    text: 'Un salon met en commun les listes d’une famille ou d’un groupe d’amis. On y entre avec le code d’un proche, qui accepte ta demande.',
    next: 'Rejoindre la démo',
  },
  { kind: 'screen', id: 'room', part: 2 },
  {
    kind: 'spot', target: 'nav-messages', part: 3, clickTarget: true,
    title: 'Amis et messages',
    text: 'Ajoute tes proches en ami pour voir leurs listes, discuter et vous envoyer des disques. Touche Messages !',
  },
  { kind: 'screen', id: 'chat', part: 3 },
  { kind: 'modal', id: 'end' },
]
const PARTS = 4

// L'élément visible qui porte data-tour="…" (le + sur téléphone, la barre sur ordinateur…)
function findTarget(name) {
  const all = document.querySelectorAll(`[data-tour="${name}"]`)
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

// Suit la position de l'élément éclairé (défilement, changement de page, rotation…)
function useTargetRect(name, scroll) {
  const [rect, setRect] = useState(null)
  const scrolled = useRef(false)
  useEffect(() => {
    scrolled.current = false
    if (!name) return
    let raf
    let last = ''
    const tick = () => {
      const el = findTarget(name)
      if (el && scroll && !scrolled.current) {
        el.scrollIntoView({ block: 'center' })
        scrolled.current = true
      }
      const r = el?.getBoundingClientRect()
      const key = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : ''
      if (key !== last) {
        last = key
        setRect(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [name, scroll])
  return rect
}

function Dots({ part }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: PARTS }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === part ? 'w-5 bg-accent' : 'w-1.5 bg-line'}`} />
      ))}
    </div>
  )
}

// La bulle d'explication
function Bubble({ step, onNext, onSkip, style, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="animate-pop pointer-events-auto absolute rounded-2xl bg-surface p-4 shadow-2xl shadow-black/40 sm:max-w-sm"
      style={style}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        Étape {step.part} sur {PARTS}
      </p>
      <p id="tour-title" className="mt-1 text-lg font-black">{step.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
      {children}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button onClick={onSkip} className={`${btn.quiet} shrink-0 whitespace-nowrap`}>Passer la visite</button>
        {onNext ? (
          <button onClick={onNext} className={btn.primary} autoFocus>
            {step.next || 'Suivant'}
          </button>
        ) : (
          <Dots part={step.part} />
        )}
      </div>
    </div>
  )
}

// --- Faux salon (étape 4) ---
function FakeRoom({ me, onNext, onSkip }) {
  const wishes = [
    { title: 'Blonde', artist: 'Frank Ocean', color: '#c9a227', by: WANDA, priority: 3 },
    { title: 'Disque de démo', artist: 'Wishdisc', color: '#6aa6d6', by: me, priority: 2 },
  ]
  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto bg-ink">
      <div className="keep-day bg-accent px-5 pb-6 pt-8 text-ink">
        <p className="text-xs uppercase tracking-[0.14em] opacity-80">Salon · code {DEMO_CODE}</p>
        <p className="mt-1.5 font-display text-4xl font-black uppercase leading-none">Famille démo</p>
        <div className="mt-4 flex">
          {[me, WANDA].map((p, i) => (
            <span
              key={p.name}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-accent text-sm font-black text-[#1b2420] ${i ? '-ml-2' : ''}`}
              style={{ background: p.color }}
            >
              {p.name[0]}
            </span>
          ))}
        </div>
      </div>
      <ul className="mx-auto flex max-w-lg flex-col gap-3 px-4 pt-5">
        {wishes.map((w) => (
          <li key={w.title} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            <span className="h-16 w-16 shrink-0 rounded-md" style={{ background: w.color }} />
            <span className="min-w-0">
              <span className="block font-bold">{w.title}</span>
              <span className="block text-sm text-muted">{w.artist}</span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.by.color }} />
                Souhait de {w.by === me ? 'toi' : w.by.name}
                <span className="flex text-accent">
                  {Array.from({ length: w.priority }).map((_, i) => <StarIcon key={i} filled width={12} height={12} />)}
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <Bubble
        step={{ part: 2, title: 'Tu es dans le salon', text: 'Ici, chacun voit les souhaits et les collections des autres. Pratique pour les anniversaires : on sait quoi offrir, et à qui.' }}
        onNext={onNext}
        onSkip={onSkip}
        style={{ left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      />
    </div>
  )
}

// --- Fausse conversation avec Wanda (étape 6) : on peut lui répondre, rien ne part ---
function FakeChat({ onNext, onSkip }) {
  const [msgs, setMsgs] = useState([
    { from: 'wanda', text: 'Coucou ! Regarde ce disque, il est dans ma liste' },
    { from: 'wanda', disc: { title: 'Blonde', artist: 'Frank Ocean', color: '#c9a227' } },
  ])
  const [text, setText] = useState('')
  const end = useRef(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs])

  function send(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setMsgs((m) => [...m, { from: 'me', text: t }])
    setText('')
    setTimeout(() => setMsgs((m) => [...m, { from: 'wanda', text: 'Trop bien ! On en reparle dans le salon.' }]), 900)
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col bg-ink">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full font-black text-[#1b2420]" style={{ background: WANDA.color }}>W</span>
        <span>
          <span className="flex items-center gap-2 font-bold">
            Wanda <span className="keep-day rounded-full bg-sun px-2 py-0.5 text-[10px] font-black text-paper">DÉMO</span>
          </span>
          <span className="block text-xs text-muted">Amie de démo, rien n’est envoyé</span>
        </span>
      </div>
      <Bubble
        step={{ part: 3, title: 'Discute avec tes amis', text: 'Réponds à Wanda pour essayer, ou envoie-lui un disque depuis sa fiche. Ici, rien ne part pour de vrai.' }}
        onNext={onNext}
        onSkip={onSkip}
        style={{ position: 'relative', margin: '12px 16px 0' }}
      />
      <div className="nice-scroll mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {msgs.map((m, i) =>
          m.disc ? (
            <span key={i} className="flex items-center gap-2 self-start rounded-2xl border border-line bg-surface p-2">
              <span className="h-11 w-11 rounded-md" style={{ background: m.disc.color }} />
              <span className="text-sm font-bold">{m.disc.title}<span className="block font-normal text-muted">{m.disc.artist}</span></span>
            </span>
          ) : (
            <span
              key={i}
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.from === 'me' ? 'self-end rounded-br-md bg-accent text-ink' : 'self-start rounded-bl-md border border-line bg-surface'
              }`}
            >
              {m.text}
            </span>
          )
        )}
        <span ref={end} />
      </div>
      <form onSubmit={send} className="mx-auto flex w-full max-w-lg gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écris à Wanda…"
          aria-label="Message à Wanda (démo)"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-base outline-none focus:border-accent"
        />
        <button className={`${btn.primary} h-11`}>Envoyer</button>
      </form>
    </div>
  )
}

// --- La visite ---
// onSection(name) : changer de page ; onDemoVinyl(bool) : montrer / retirer le disque de démo ;
// onFinish(action) : fin de visite (action : 'add', 'rooms' ou null)
export default function Tour({ me, onSection, onDemoVinyl, onFinish }) {
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const rect = useTargetRect(step.kind === 'spot' ? step.target : null, step.scroll)

  // Chaque étape ouvre sa page
  useEffect(() => {
    if (step.section) onSection(step.section)
    if (step.target === 'add') window.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function next() {
    if (step.target === 'add') onDemoVinyl(true) // le faux disque arrive dans la liste
    setIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }
  function finish(action) {
    onDemoVinyl(false)
    onFinish(action)
  }
  const skip = () => finish(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && finish(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // --- Fenêtres de début et de fin ---
  if (step.kind === 'modal') {
    const start = step.id === 'welcome'
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-5 backdrop-blur-[2px]">
        <div role="dialog" aria-modal="true" aria-labelledby="tour-title" className="animate-pop w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-2xl">
          {start ? (
            <>
              <BrandMark size={64} className="mx-auto" />
              <p id="tour-title" className="mt-4 font-display text-3xl font-black uppercase leading-[0.95]">
                Bienvenue,
                <br />
                {me.name} !
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Une petite visite d’une minute pour tout voir. Ce qu’on ajoute pendant la visite est pour de faux.
              </p>
              <button onClick={next} className={`${btn.primary} mt-5 w-full py-3 text-base`} autoFocus>C’est parti</button>
              <button onClick={skip} className={`${btn.quiet} mt-2`}>Passer la visite</button>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Étape {PARTS} sur {PARTS}</p>
              <p id="tour-title" className="mt-2 font-display text-3xl font-black uppercase leading-[0.95]">
                À toi de
                <br />
                jouer !
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Le disque, le salon et Wanda étaient là pour la démo : ils disparaissent. Ta liste est toute neuve.
              </p>
              <button onClick={() => finish('add')} className={`${btn.primary} mt-5 w-full py-3 text-base`} autoFocus>
                Ajouter mon premier disque
              </button>
              <button onClick={() => finish('rooms')} className={`${btn.secondary} mt-2 w-full py-3 text-base`}>
                J’ai un code de salon
              </button>
              <p className="mt-3 text-xs text-muted">Tu peux revoir la visite depuis ton profil.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // --- Faux écrans ---
  if (step.kind === 'screen') {
    return (
      <div className="fixed inset-0 z-[70]">
        {step.id === 'room' ? <FakeRoom me={me} onNext={next} onSkip={skip} /> : <FakeChat onNext={next} onSkip={skip} />}
      </div>
    )
  }

  // --- Lumière sur un élément ---
  const pad = 6
  const vw = window.innerWidth
  const vh = window.innerHeight
  const hole = rect && {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }
  // La bulle se place du côté où il y a le plus de place
  const below = hole && hole.top + hole.height / 2 < vh / 2
  const narrow = vw < 640
  const bubbleStyle = !hole
    ? { left: 16, right: 16, top: '40%' }
    : {
        ...(narrow
          ? { left: 16, right: 16 }
          : { left: Math.min(Math.max(16, hole.left), vw - 400), width: 384 }),
        ...(below ? { top: hole.top + hole.height + 16 } : { bottom: vh - hole.top + 16 }),
      }

  // Un texte modifié pour l'étape des salons : le code de démo est déjà là
  const extra =
    step.target === 'join' ? (
      <p className="mt-3 flex items-center justify-between rounded-xl border border-line bg-raised/60 px-3 py-2">
        <span className="font-mono text-lg font-bold tracking-[0.2em]">{DEMO_CODE}</span>
        <span className="text-xs text-muted">code de démo</span>
      </p>
    ) : null

  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: 'auto' }}>
      {/* Le gris, avec un trou lumineux autour de l'élément */}
      {hole ? (
        <button
          type="button"
          aria-label={step.clickTarget ? step.title : undefined}
          tabIndex={step.clickTarget ? 0 : -1}
          onClick={step.clickTarget ? next : undefined}
          className={`tour-hole absolute rounded-[18px] ${step.clickTarget ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}
      <Bubble step={step} onNext={step.clickTarget ? null : next} onSkip={skip} style={bubbleStyle}>
        {extra}
      </Bubble>
    </div>
  )
}
