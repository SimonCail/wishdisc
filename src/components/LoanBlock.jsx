import { useState } from 'react'
import { Avatar } from './Avatar'
import { btn } from '../lib/ui'
import { locale, t, tn } from '../lib/i18n'

export const daysSince = (iso) => {
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86400000)) : 0
}

// Dates « 2026-12-24 » à l'heure locale
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const inDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDay(d)
}
// En retard : la date de retour est passée (sans date, jamais en retard)
export const isLate = (loan) => !!loan.due_date && loan.due_date < isoDay()
export const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })

// « à rendre le 3 décembre » / « en retard depuis le 3 décembre » / « sans date de retour »
export function dueLabel(loan) {
  if (!loan.due_date) return t('sans date de retour')
  if (loan.due_date === isoDay()) return t('à rendre aujourd’hui')
  return isLate(loan) ? t('en retard depuis le {date}', { date: shortDate(loan.due_date) }) : t('à rendre le {date}', { date: shortDate(loan.due_date) })
}

// Nom de la personne à qui le disque est prêté
export function borrowerOf(loan, people) {
  return (loan.borrower_id && people.get(loan.borrower_id)) || (loan.borrower_name ? { id: null, name: loan.borrower_name } : { id: null, name: t('quelqu’un') })
}

const durations = () => [
  ['none', t('Sans date'), null],
  ['1w', t('1 semaine'), 7],
  ['2w', t('2 semaines'), 14],
  ['1m', t('1 mois'), 30],
  ['pick', t('Choisir une date'), null],
]

// Dans la fiche d'un disque de ma collection : le prêt en cours, ou « Prêter »
export default function LoanBlock({ loan, friends, people, offline, onLend, onReturn, onAskBack }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [duration, setDuration] = useState('none')
  const [picked, setPicked] = useState(inDays(14))

  async function run(fn) {
    setBusy(true)
    const ok = await fn()
    setBusy(false)
    if (ok) {
      setOpen(false)
      setName('')
    }
  }

  const DURATIONS = durations()
  const span = DURATIONS.find((d) => d[0] === duration)?.[2]
  const dueDate = duration === 'pick' ? picked || null : span ? inDays(span) : null
  const lendTo = (who) => run(() => onLend({ ...who, dueDate }))

  if (loan) {
    const who = borrowerOf(loan, people)
    const days = daysSince(loan.lent_at)
    const late = isLate(loan)
    const askedToday = loan.return_asked_at && isoDay(new Date(loan.return_asked_at)) === isoDay()
    return (
      <div className={`mt-5 rounded-2xl border p-3.5 ${late ? 'border-coral' : 'border-line'}`}>
        <div className="flex items-center gap-3">
          {who.id ? <Avatar member={who} size={36} ring={false} /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised font-bold">{who.name[0]?.toUpperCase()}</span>}
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t('Prêté à {name}', { name: who.name })}</p>
            <p className="text-sm text-muted">
              {days === 0 ? t('depuis aujourd’hui') : tn(days, 'depuis {n} jour', 'depuis {n} jours')}
              {' · '}
              <span className={late ? 'font-bold text-coral' : ''}>{dueLabel(loan)}</span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => run(onReturn)} disabled={busy || offline} className={`${btn.primary} px-4 py-2`}>
            {t('Il est rendu')}
          </button>
          {who.id && (
            <button onClick={() => run(onAskBack)} disabled={busy || offline || askedToday} className={`${btn.secondary} px-4 py-2`}>
              {askedToday ? t('Demande envoyée') : loan.return_asked_at ? t('Redemander') : t('Demander de le rendre')}
            </button>
          )}
        </div>
      </div>
    )
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={offline}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition hover:border-accent hover:bg-raised/50 disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('Prêt')}</span>
          <span className="mt-1 block text-sm text-muted">{t('Chez toi en ce moment')}</span>
        </span>
        <span className="shrink-0 text-sm font-bold text-accent">{t('Prêter')}</span>
      </button>
    )
  }

  return (
    <div className="mt-5 rounded-2xl border border-line p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('Retour prévu')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DURATIONS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setDuration(id)}
            aria-pressed={duration === id}
            className={`rounded-full border px-3 py-1 text-sm transition ${duration === id ? 'border-accent bg-accent font-bold text-ink' : 'border-line hover:border-accent'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {duration === 'pick' && (
        <input
          type="date"
          value={picked}
          min={inDays(1)}
          onChange={(e) => setPicked(e.target.value)}
          aria-label={t('Date de retour')}
          className="mt-2 h-11 rounded-2xl border border-line bg-ink/40 px-3 text-base outline-none focus:border-accent"
        />
      )}
      <p className="mt-1.5 text-xs text-muted">
        {dueDate ? t('À rendre le {date}. Une notification arrive ce jour-là.', { date: shortDate(dueDate) }) : t('Pas de rappel, prêté le temps qu’il faudra.')}
      </p>
      <p className="mt-4 font-bold">{t('Prêter ce disque à…')}</p>
      {friends.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {friends.map((f) => (
            <button
              key={f.id}
              disabled={busy}
              onClick={() => lendTo({ borrowerId: f.id })}
              className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-3 text-sm transition hover:border-accent"
            >
              <Avatar member={f} size={24} ring={false} /> {f.name}
            </button>
          ))}
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) lendTo({ name })
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={t('Ou un autre prénom…')}
          aria-label={t('Prénom de la personne')}
          className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-ink/40 px-3.5 text-base outline-none focus:border-accent"
        />
        <button type="submit" disabled={busy || !name.trim()} className={`${btn.primary} shrink-0 px-4`}>
          {t('Prêter')}
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between">
        <span />
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-paper">
          {t('Annuler')}
        </button>
      </div>
    </div>
  )
}