import { useEffect, useState } from 'react'
import useVisibleArea from '../hooks/useVisibleArea'
import { btn } from '../lib/ui'
import { COLORS, CONDITIONS, KINDS, normalizeEdition } from '../lib/edition'
import { Swatch, PenIcon } from './EditionTags'
import { CloseIcon } from './Icons'

const KNOWN = new Set(COLORS.map((c) => c.key))

function Section({ title, hint, children }) {
  return (
    <section className="border-t border-line/70 py-4 first:border-t-0 first:pt-1">
      <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${
        active ? 'border-accent bg-accent font-bold text-ink keep-day' : 'border-line hover:border-accent'
      }`}
    >
      {children}
    </button>
  )
}

const field =
  'h-11 w-full rounded-2xl border border-line bg-ink/40 px-3.5 text-base outline-none transition placeholder:text-muted/70 focus:border-accent'

// Formulaire « Mon édition » : panneau en bas sur téléphone, fenêtre sur ordinateur
export default function EditionSheet({ vinyl, mode, onSave, onClose }) {
  const start = vinyl.edition || {}
  const [ed, setEd] = useState(() => ({
    color: start.color ?? '',
    signed: !!start.signed,
    number: start.number ?? '',
    of: start.of ?? '',
    kind: start.kind ?? '',
    shop: start.shop ?? '',
    condition: start.condition ?? '',
    exact: typeof start.exact === 'boolean' ? start.exact : null,
  }))
  const [otherColor, setOtherColor] = useState(() => !!start.color && !KNOWN.has(start.color))
  const [saving, setSaving] = useState(false)
  const area = useVisibleArea()
  const set = (patch) => setEd((e) => ({ ...e, ...patch }))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const ok = await onSave(normalizeEdition({ ...ed, exact: ed.exact ?? undefined }, mode))
    setSaving(false)
    if (ok) onClose()
  }

  function clearAll() {
    setEd({ color: '', signed: false, number: '', of: '', kind: '', shop: '', condition: '', exact: null })
    setOtherColor(false)
  }

  return (
    <div
      className="fixed inset-x-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ top: area.top, height: area.height }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edition-title"
        className="animate-pop flex w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-line bg-surface shadow-2xl shadow-black/50 sm:rounded-3xl"
        style={{ maxHeight: area.keyboard ? area.height - 8 : '90%' }}
      >
        <header className="flex items-start gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0 flex-1">
            <h3 id="edition-title" className="font-display text-xl font-bold">
              Mon édition
            </h3>
            <p className="truncate text-sm text-muted">
              {vinyl.title} · {vinyl.artist}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className={`${btn.icon} -mr-2 -mt-2`}>
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          {mode === 'wish' && (
            <Section title="Ce que tu veux" hint="Tes proches sauront si n’importe quel pressage te fait plaisir.">
              <div className="grid grid-cols-2 gap-2">
                {[
                  [false, 'Peu importe l’édition'],
                  [true, 'Cette édition précise'],
                ].map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={ed.exact === value}
                    onClick={() => set({ exact: ed.exact === value ? null : value })}
                    className={`rounded-2xl border px-3 py-2.5 text-sm transition ${
                      ed.exact === value ? 'keep-day border-accent bg-accent font-bold text-ink' : 'border-line hover:border-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
          )}

          <Section title="Couleur du vinyle">
            <div className="grid grid-cols-5 gap-x-1 gap-y-3 sm:grid-cols-6">
              {COLORS.map((c) => {
                const active = !otherColor && ed.color === c.key
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setOtherColor(false)
                      set({ color: active ? '' : c.key })
                    }}
                    className="group flex flex-col items-center gap-1 text-[11px] leading-tight"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                        active ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'group-hover:scale-105'
                      }`}
                    >
                      <Swatch swatch={c.swatch} size={34} />
                    </span>
                    <span className={active ? 'font-bold' : 'text-muted'}>{c.label}</span>
                  </button>
                )
              })}
              <button
                type="button"
                aria-pressed={otherColor}
                onClick={() => {
                  setOtherColor(!otherColor)
                  set({ color: '' })
                }}
                className="group flex flex-col items-center gap-1 text-[11px] leading-tight"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                    otherColor ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'group-hover:scale-105'
                  }`}
                >
                  <Swatch swatch="neutral" size={34} />
                </span>
                <span className={otherColor ? 'font-bold' : 'text-muted'}>Autre</span>
              </button>
            </div>
            {otherColor && (
              <input
                value={ed.color}
                onChange={(e) => set({ color: e.target.value })}
                placeholder="Ex. vert sapin, bleu nuit translucide…"
                maxLength={40}
                aria-label="Couleur du vinyle"
                className={`${field} mt-3`}
              />
            )}
          </Section>

          <Section title="Signé">
            <label className="flex cursor-pointer items-center gap-3">
              <span className="text-muted">
                <PenIcon width={20} height={20} />
              </span>
              <span className="flex-1">
                <span className="block font-bold">Signé ou dédicacé</span>
                <span className="block text-xs text-muted">Par l’artiste, sur la pochette ou le disque</span>
              </span>
              <input type="checkbox" className="peer sr-only" checked={ed.signed} onChange={(e) => set({ signed: e.target.checked })} />
              <span
                aria-hidden="true"
                className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60 peer-checked:[&>span]:translate-x-[1.375rem]"
              >
                <span className="absolute left-0 top-0.5 h-6 w-6 translate-x-0.5 rounded-full bg-white shadow transition-transform" />
              </span>
            </label>
          </Section>

          <Section title="Numéroté" hint="Le numéro écrit sur la pochette, et le tirage total si tu le connais.">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted">N°</span>
              <input
                value={ed.number}
                onChange={(e) => set({ number: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                inputMode="numeric"
                placeholder="245"
                aria-label="Numéro"
                className={`${field} w-24 text-center`}
              />
              <span className="text-sm text-muted">sur</span>
              <input
                value={ed.of}
                onChange={(e) => set({ of: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                inputMode="numeric"
                placeholder="1000"
                aria-label="Tirage total"
                className={`${field} w-28 text-center`}
              />
            </div>
          </Section>

          <Section title="Édition">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <Pill key={k.key} active={ed.kind === k.key} onClick={() => set({ kind: ed.kind === k.key ? '' : k.key })}>
                  {k.label}
                </Pill>
              ))}
            </div>
            {ed.kind === 'exclusive' && (
              <input
                value={ed.shop}
                onChange={(e) => set({ shop: e.target.value })}
                placeholder="Chez qui ? Fnac, Rough Trade, le site de l’artiste…"
                maxLength={40}
                aria-label="Exclusivité de"
                className={`${field} mt-3`}
              />
            )}
          </Section>

          {mode === 'owned' && (
            <Section title="État">
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Pill key={c.key} active={ed.condition === c.key} onClick={() => set({ condition: ed.condition === c.key ? '' : c.key })}>
                    {c.label}
                  </Pill>
                ))}
              </div>
            </Section>
          )}
        </div>

        <footer
          className="flex items-center gap-2 border-t border-line/70 px-5 pt-3"
          style={{ paddingBottom: area.keyboard ? '0.75rem' : 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button type="button" onClick={clearAll} className={btn.quiet}>
            Tout effacer
          </button>
          <button type="submit" disabled={saving} className={`${btn.primary} ml-auto min-w-[8.5rem]`}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </footer>
      </form>
    </div>
  )
}
