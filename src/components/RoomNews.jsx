import { useState } from 'react'
import Cover from './Cover'
import { AvatarStack } from './Avatar'
import { CloseIcon, GiftIcon } from './Icons'
import { itemKey } from '../lib/discogs'
import { ENVIE } from '../lib/envie'
import { t, tn, locale } from '../lib/i18n'

// « mardi », « hier », « ce matin », « 12 nov. »
const daysAgo = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  return Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000)
}
const weekday = (iso) => new Date(iso).toLocaleDateString(locale(), { weekday: 'long' })
const shortDate = (iso) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })

// « depuis ta visite de mardi », « …d’hier », « …de ce matin »
function sinceVisit(iso) {
  const days = daysAgo(iso)
  if (days <= 0) return new Date(iso).getHours() < 12 ? t('depuis ta visite de ce matin') : t('depuis ta visite d’aujourd’hui')
  if (days === 1) return t('depuis ta visite d’hier')
  if (days < 7) return t('depuis ta visite de {day}', { day: weekday(iso) })
  return t('depuis ta visite du {date}', { date: shortDate(iso) })
}
// « aujourd’hui », « hier », « mardi », « 12 nov. »
function dayLabel(iso) {
  const days = daysAgo(iso)
  if (days <= 0) return t('aujourd’hui')
  if (days === 1) return t('hier')
  if (days < 7) return weekday(iso)
  return shortDate(iso)
}

// Les nouveautés du salon depuis ma dernière visite.
// news : { added: [{ it, owner }], moved: [{ it, owner }], gifts: [{ it, owner, reserver }] }
export default function RoomNews({ since, news, mode, onOpen, onDismiss }) {
  const [open, setOpen] = useState(false)
  const added = news.added
  const total = added.length + news.moved.length + news.gifts.length
  if (!since || total === 0) return null
  const who = [...new Map([...added, ...news.moved].map((e) => [e.owner.id, e.owner])).values()]
  const headline = added.length
    ? mode === 'wish'
      ? tn(added.length, '{n} nouveau souhait', '{n} nouveaux souhaits')
      : tn(added.length, '{n} nouveau disque', '{n} nouveaux disques')
    : tn(total, '{n} nouveauté', '{n} nouveautés')

  const line = (key, it, text, extra = null) => (
    <li key={key} className="flex items-center gap-3 py-2.5">
      <button onClick={() => onOpen(itemKey(it))} className="shrink-0" aria-label={t('Ouvrir {title}', { title: it.title })}>
        <Cover url={it.cover_url} className="h-12 w-12 rounded ring-1 ring-black/10" />
      </button>
      <div className="min-w-0 flex-1">
        <button onClick={() => onOpen(itemKey(it))} className="block max-w-full truncate text-left text-sm font-bold hover:text-accent">
          {it.title} <span className="font-normal text-muted">· {it.artist}</span>
        </button>
        <p className="truncate text-xs text-muted">{text}</p>
      </div>
      {extra}
    </li>
  )

  return (
    <section className="mb-8 overflow-hidden rounded-3xl bg-raised" aria-label={t('Nouveautés du salon')}>
      <div className="flex items-center gap-3 p-3.5 pl-4">
        {who.length > 0 && <AvatarStack members={who} size={28} max={3} />}
        <p className="min-w-0 flex-1 leading-tight">
          <span className="block font-bold">{headline}</span>
          <span className="block text-sm text-muted">{sinceVisit(since)}</span>
        </p>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="keep-day shrink-0 rounded-full bg-sun px-4 py-2 text-sm font-bold text-paper transition hover:brightness-105"
        >
          {open ? t('Masquer') : t('Voir')}
        </button>
        <button onClick={onDismiss} aria-label={t('J’ai vu, ne plus afficher')} className="-mr-1 shrink-0 rounded-full p-2 text-muted hover:text-paper">
          <CloseIcon width={16} height={16} />
        </button>
      </div>
      {open && (
        <div className="border-t border-line/70 px-4 pb-2">
          {added.length > 0 && (
            <ul className="divide-y divide-line/60">
              {added.map((e) =>
                line(
                  `a${e.it.id}`,
                  e.it,
                  `${e.owner.name} · ${dayLabel(e.it.created_at)}${mode === 'wish' && e.it.priority ? ` · ${ENVIE[e.it.priority]}` : ''}`
                )
              )}
            </ul>
          )}
          {(news.moved.length > 0 || news.gifts.length > 0) && (
            <>
              <p className="pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{t('Et aussi')}</p>
              <ul className="divide-y divide-line/60">
                {news.moved.map((e) => line(`m${e.it.id}`, e.it, t('{name} l’a eu, il est passé dans sa collection', { name: e.owner.name })))}
                {news.gifts.map((e) =>
                  line(
                    `g${e.it.id}`,
                    e.it,
                    t('{name} va l’offrir à {name2}', { name: e.reserver.name, name2: e.owner.name }),
                    <GiftIcon width={16} height={16} className="shrink-0 text-muted" />
                  )
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
