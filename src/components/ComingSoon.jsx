import { useEffect, useMemo, useRef, useState } from 'react'
import Cover from './Cover'
import { CheckIcon, PlusIcon } from './Icons'
import { fetchReleases, releaseKey } from '../lib/releases'
import { locale, t } from '../lib/i18n'

const SHOWN = 6
const DAY = 86400000

// « 2027-03 » (jour pas encore annoncé) compte comme le 1er du mois
const asDate = (date) => new Date(`${date.length === 7 ? `${date}-01` : date}T12:00:00`)
const daysUntil = (date) => Math.round((asDate(date) - new Date(new Date().toDateString() + ' 12:00')) / DAY)

// « Bientôt dans les bacs » : les prochains albums des artistes de ma liste.
// On ne va chercher qu'une fois la section près de l'écran (et pas hors connexion).
export default function ComingSoon({ myItems, online, onAdd, id }) {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  const [list, setList] = useState(null)
  const [all, setAll] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (!('IntersectionObserver' in window)) {
      setNear(true)
      return
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  // On ne relance que si les artistes changent vraiment (la clé est calculée dans fetchReleases)
  const artistsSig = useMemo(() => myItems.map((it) => it.artist).sort().join('|'), [myItems])
  const itemsRef = useRef(myItems)
  itemsRef.current = myItems

  useEffect(() => {
    if (!near || !online) return
    let alive = true
    fetchReleases(itemsRef.current)
      .then((l) => alive && setList(l))
      .catch(() => alive && setList((cur) => cur || []))
    return () => {
      alive = false
    }
  }, [near, online, artistsSig])

  const mine = useMemo(() => {
    const m = new Map()
    for (const it of myItems) m.set(releaseKey(it), it.status)
    return m
  }, [myItems])

  const shown = list ? (all ? list : list.slice(0, SHOWN)) : []
  const out = shown.filter((r) => daysUntil(r.date) < 0 && !r.byMonth)
  const soon = shown.filter((r) => !out.includes(r) && daysUntil(r.date) <= 31)
  const later = shown.filter((r) => !out.includes(r) && daysUntil(r.date) > 31)

  if (!online && !list) return null
  return (
    <section id={id} ref={ref} aria-label={t('Bientôt dans les bacs')} className="scroll-mt-20 space-y-4">
      <div className="pr-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{t('D’après tes artistes')}</p>
        <h2 className="font-display text-3xl font-black uppercase leading-none sm:text-4xl">{t('Bientôt dans les bacs')}</h2>
        <p className="mt-1.5 text-sm text-muted">{t('Les albums qui viennent de sortir ou vont sortir, pour les artistes de ta liste.')}</p>
      </div>
      {list === null ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" /> {t('On cherche les prochaines sorties…')}
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-sm text-muted">
          {t('Aucune sortie annoncée pour tes artistes en ce moment. On regarde à nouveau régulièrement.')}
        </p>
      ) : (
        <>
          {out.length > 0 && <Group label={t('Vient de sortir')} rows={out} mine={mine} onAdd={onAdd} />}
          {soon.length > 0 && <Group label={t('Dans le mois')} rows={soon} mine={mine} onAdd={onAdd} />}
          {later.length > 0 && <Group label={t('Plus tard')} rows={later} mine={mine} onAdd={onAdd} />}
          {list.length > SHOWN && (
            <button onClick={() => setAll((a) => !a)} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
              {all ? t('Voir moins') : t('Voir les {n} sorties', { n: list.length })}
            </button>
          )}
        </>
      )}
    </section>
  )
}

function Group({ label, rows, mine, onAdd }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {rows.map((r) => (
          <Release key={r.id} r={r} status={mine.get(releaseKey(r))} onAdd={onAdd} />
        ))}
      </ul>
    </div>
  )
}

function Release({ r, status, onAdd }) {
  const d = asDate(r.date)
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pr-3">
      <div className="w-11 shrink-0 text-center leading-none">
        <span className="block font-display text-2xl font-black">{r.byMonth ? '··' : d.getDate()}</span>
        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-muted">
          {d.toLocaleDateString(locale(), { month: 'short' }).replace('.', '')}
        </span>
      </div>
      <Cover url={r.cover_url} className="h-12 w-12 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{r.title}</p>
        <p className="truncate text-xs text-muted">
          {r.artist} · {r.type === 'EP' ? 'EP' : t('album')}
          {d.getFullYear() !== new Date().getFullYear() ? ` · ${d.getFullYear()}` : ''}
        </p>
      </div>
      {status ? (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
          <CheckIcon width={14} height={14} /> {status === 'owned' ? t('Dans ta collection') : t('Dans tes souhaits')}
        </span>
      ) : (
        <button
          onClick={() => onAdd(r)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-accent-soft"
        >
          <PlusIcon width={13} height={13} /> {t('Souhait')}
        </button>
      )}
    </li>
  )
}