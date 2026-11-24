import { useState } from 'react'
import Cover from './Cover'
import { Avatar } from './Avatar'
import { GiftIcon, StarIcon } from './Icons'
import { itemKey } from '../lib/discogs'
import { giftEditionHint } from '../lib/edition'
import { btn } from '../lib/ui'
import { t, tn } from '../lib/i18n'

// Salon, « Idées cadeaux » : les souhaits des autres qui ne sont pas encore réservés,
// les plus voulus d'abord. La personne à qui on offre ne voit jamais rien de tout ça.
// entries : [{ it, owner, reservation }] (souhaits des autres membres)
export default function GiftIdeas({ entries, members, meId, missing, offline, onReserve, onCancel, onOpen }) {
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(null)
  const people = members.filter((m) => m.id !== meId && entries.some((e) => e.owner.id === m.id))
  const forWho = who && people.some((m) => m.id === who) ? who : ''
  const pick = (list) => (forWho ? list.filter((e) => e.owner.id === forWho) : list)

  const free = pick(entries.filter((e) => !e.reservation)).sort(
    (a, b) =>
      (b.it.priority || 0) - (a.it.priority || 0) ||
      // à envie égale : ceux qui acceptent n'importe quelle édition d'abord (plus faciles à trouver)
      Number(!!giftEditionHint(b.it.edition)?.easy) - Number(!!giftEditionHint(a.it.edition)?.easy) ||
      (a.it.created_at < b.it.created_at ? 1 : -1)
  )
  const mine = pick(entries.filter((e) => e.reservation?.reserved_by === meId))
  const taken = pick(entries.filter((e) => e.reservation && e.reservation.reserved_by !== meId)).length

  async function act(e, reserve) {
    setBusy(e.it.id)
    await (reserve ? onReserve(e) : onCancel(e))
    setBusy(null)
  }

  if (missing) {
    return <p className="py-10 text-center text-muted">{t('Lance d’abord le script 20-je-l-offre.sql dans Supabase pour les idées cadeaux.')}</p>
  }

  // (une fonction et pas un composant : la ligne n'est pas recréée à chaque affichage)
  const row = (e, reserved = false) => {
    const hint = giftEditionHint(e.it.edition)
    return (
      <li key={e.it.id} className="flex items-center gap-3 border-b border-line/70 py-3 last:border-b-0">
        <button onClick={() => onOpen(itemKey(e.it))} className="shrink-0" aria-label={t('Ouvrir {title}', { title: e.it.title })}>
          <Cover url={e.it.cover_url} className="h-16 w-16 rounded-md ring-1 ring-black/10 sm:h-20 sm:w-20" />
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => onOpen(itemKey(e.it))} className="block max-w-full truncate text-left font-bold hover:text-accent">
            {e.it.title}
          </button>
          <p className="truncate text-sm text-muted">{e.it.artist}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Avatar member={e.owner} size={18} ring={false} /> {t('Pour {name}', { name: e.owner.name })}
            </span>
            {e.it.priority > 0 && (
              <span className="flex text-accent" aria-label={t('Envie {priority} sur 3', { priority: e.it.priority })}>
                {Array.from({ length: e.it.priority }).map((_, i) => (
                  <StarIcon key={i} filled width={12} height={12} />
                ))}
              </span>
            )}
            {hint && (
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  hint.easy ? 'keep-day bg-accent/20 text-paper' : 'border border-accent text-paper'
                }`}
              >
                {hint.label}
              </span>
            )}
          </p>
        </div>
        {reserved ? (
          <button onClick={() => act(e, false)} disabled={busy === e.it.id || offline} className={`${btn.quiet} shrink-0`}>{t('Annuler')}</button>
        ) : (
          <button onClick={() => act(e, true)} disabled={busy === e.it.id || offline} className={`${btn.primary} shrink-0 px-3.5 py-2`}>
            <GiftIcon width={15} height={15} />{' '}{t('Je l’offre')}</button>
        )}
      </li>
    )
  }

  return (
    <div>
      {people.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: '', name: t('Tout le monde') }, ...people].map((m) => (
            <button
              key={m.id || 'all'}
              onClick={() => setWho(m.id)}
              aria-pressed={forWho === m.id}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${
                forWho === m.id ? 'border-accent bg-accent font-bold text-ink' : 'border-line text-muted hover:border-accent hover:text-paper'
              }`}
            >
              {m.id && <Avatar member={m} size={18} ring={false} className="-ml-1.5" />}
              {m.name}
            </button>
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <section className="mb-6 rounded-2xl border border-accent/60 p-4 pb-1">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <GiftIcon width={15} height={15} />{' '}{t('Tu offres')}</h3>
          <ul>
            {mine.map((e) => row(e, true))}
          </ul>
        </section>
      )}

      {free.length > 0 ? (
        <ul>
          {free.map((e) => row(e))}
        </ul>
      ) : (
        <p className="py-10 text-center text-muted">
          {entries.length === 0 ? t('Personne n’a encore de souhaits dans ce salon.') : t('Tous les souhaits sont déjà réservés. Bravo !')}
        </p>
      )}

      {taken > 0 && (
        <p className="mt-4 text-center text-sm text-muted">
          {tn(taken, '{n} disque déjà réservé par d’autres est caché.', '{n} disques déjà réservés par d’autres sont cachés.')}
        </p>
      )}
    </div>
  )
}
