import { useState } from 'react'
import Cover from './Cover'
import { Avatar } from './Avatar'
import { btn } from '../lib/ui'
import { locale, t, tn } from '../lib/i18n'

const SOON = 60 // jours : au-delà, on n'affiche pas
const dayMonth = (date) => date.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })

// « Anniversaires à venir » (page Amis) : le plus proche en grand, avec ses envies « À la folie »
// list : [{ person, date, days, age, wishes: [vinyl…] }] triée par date
export default function Birthdays({ list, onOpenFriend }) {
  const soon = list.filter((b) => b.days <= SOON)
  if (!soon.length) return null
  const [first, ...rest] = soon

  return (
    <section aria-label={t('Anniversaires à venir')}>
      <h2 className="mb-3 font-display text-2xl font-black uppercase">{t('Anniversaires à venir')}</h2>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="keep-day rounded-3xl p-5 text-[#1b2420]" style={{ background: `color-mix(in oklab, ${first.person.color || '#f09aaa'} 45%, #fff6ec)` }}>
          <div className="flex items-center gap-3">
            <Avatar member={first.person} size={48} ring={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-2xl font-black uppercase leading-none">
                {first.age ? t('{name} · {age} ans', { name: first.person.name, age: first.age }) : first.person.name}
              </p>
              <p className="mt-1 text-sm opacity-75 first-letter:uppercase">{dayMonth(first.date)}</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-[#1b2420] px-3 py-2 text-center text-[#f1c04e]">
              {first.days === 0 ? (
                <span className="block text-sm font-black uppercase">{t('Aujourd’hui !')}</span>
              ) : (
                <>
                  <span className="block font-display text-2xl font-black leading-none">{first.days}</span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider">{tn(first.days, 'jour', 'jours')}</span>
                </>
              )}
            </div>
          </div>
          {first.wishes.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{t('Ses plus grosses envies')}</p>
              <div className="flex gap-2">
                {first.wishes.map((w) => (
                  <Cover key={w.id} url={w.cover_url} className="aspect-square w-[22%] max-w-24 rounded-md shadow-md" />
                ))}
              </div>
            </>
          )}
          <button onClick={() => onOpenFriend(first.person.id)} className={`${btn.primary} keep-day mt-4 !bg-[#1b2420] !text-[#f5f1e8]`}>
            {t('Voir ses envies')}
          </button>
        </div>

        {rest.length > 0 && (
          <ul className="space-y-2">
            {rest.map((b) => (
              <li key={b.person.id}>
                <button
                  onClick={() => onOpenFriend(b.person.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left transition hover:border-accent"
                >
                  <Avatar member={b.person} size={34} ring={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{b.person.name}</span>
                    <span className="block text-xs text-muted first-letter:uppercase">{dayMonth(b.date)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {b.days === 0 ? t('aujourd’hui') : tn(b.days, 'dans {n} jour', 'dans {n} jours')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// Dans le profil : « Ton anniversaire » (jour, mois, année facultative)
export function BirthdayField({ value, offline, onSave }) {
  const [day, setDay] = useState(value?.day ?? '')
  const [month, setMonth] = useState(value?.month ?? '')
  const [year, setYear] = useState(value?.year ?? '')
  const [busy, setBusy] = useState(false)
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale(), { month: 'long' }))
  const changed = String(day) !== String(value?.day ?? '') || String(month) !== String(value?.month ?? '') || String(year) !== String(value?.year ?? '')
  const valid = day && month && (!year || (Number(year) > 1900 && Number(year) <= new Date().getFullYear()))
  const field = 'h-11 rounded-2xl border border-line bg-ink/40 px-3 text-base outline-none focus:border-accent'

  async function save(v) {
    setBusy(true)
    await onSave(v)
    setBusy(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <select value={day} onChange={(e) => setDay(e.target.value)} aria-label={t('Jour')} className={`${field} w-20`}>
          <option value="">{t('Jour')}</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('Mois')} className={`${field} min-w-0 flex-1 capitalize`}>
          <option value="">{t('Mois')}</option>
          {months.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          placeholder={t('Année')}
          aria-label={t('Année (facultative)')}
          className={`${field} w-24`}
        />
      </div>
      <p className="mt-2 text-xs text-muted">{t('Visible par tes amis et les membres de tes salons. L’année est facultative.')}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => save({ day: Number(day), month: Number(month), year: year ? Number(year) : null })}
          disabled={!valid || !changed || busy || offline}
          className={btn.primary}
        >
          {t('Enregistrer')}
        </button>
        {value && (
          <button
            onClick={() => {
              setDay('')
              setMonth('')
              setYear('')
              save(null)
            }}
            disabled={busy || offline}
            className={btn.quiet}
          >
            {t('Effacer')}
          </button>
        )}
      </div>
    </div>
  )
}
