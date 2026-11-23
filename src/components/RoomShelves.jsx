import Cover from './Cover'
import { Avatar } from './Avatar'
import { StarIcon } from './Icons'
import { itemKey } from '../lib/discogs'
import { colorOf } from '../lib/edition'
import { Swatch } from './EditionTags'

const SHELF_MAX = 12 // disques montrés par rangée, le reste avec « Tout voir »

const byWish = (a, b) => (b.priority || 0) - (a.priority || 0) || (a.created_at < b.created_at ? 1 : -1)
const byOwned = (a, b) => ((a.owned_at || a.created_at) < (b.owned_at || b.created_at) ? 1 : -1)

// Les disques d'une personne, dans l'ordre de la rangée
function shelfOf(items, memberId, mode) {
  return items
    .filter((it) => it.owner_id === memberId && it.status === mode && !it.demo)
    .sort(mode === 'wish' ? byWish : byOwned)
}

// Une petite pochette de la rangée
function Mini({ it, mode, isNew, gift, onOpen }) {
  const color = colorOf(it.edition)
  return (
    <li className="w-[6.5rem] shrink-0 snap-start sm:w-36">
      <button onClick={onOpen} className="group block w-full text-left" aria-label={`${it.title}, ${it.artist}`}>
        <span className="relative block overflow-hidden rounded-md shadow-[0_8px_18px_-10px_rgba(26,22,18,0.6)] ring-1 ring-black/10 transition duration-300 group-hover:-translate-y-0.5">
          <Cover url={it.cover_url} className="aspect-square w-full" />
          {isNew && (
            <span className="keep-day absolute left-1.5 top-1.5 rounded-full bg-coral px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wide text-white shadow">
              Nouveau
            </span>
          )}
          {gift && (
            <span
              className={`keep-day absolute bottom-1.5 left-1.5 rounded-full px-1.5 py-px text-[10px] font-bold shadow ${
                gift === 'mine' ? 'bg-accent text-ink' : 'bg-sun text-paper'
              }`}
            >
              {gift === 'mine' ? 'Tu l’offres' : 'Réservé'}
            </span>
          )}
        </span>
        <span className="mt-2 block truncate text-[13px] font-bold leading-tight group-hover:text-accent">{it.title}</span>
        <span className="block truncate text-[11px] text-muted">{it.artist}</span>
        <span className="mt-0.5 flex h-4 items-center gap-1">
          {mode === 'wish' && it.priority > 0 && (
            <span className="flex text-accent" aria-label={`Envie ${it.priority} sur 3`}>
              {Array.from({ length: it.priority }).map((_, i) => (
                <StarIcon key={i} filled width={12} height={12} />
              ))}
            </span>
          )}
          {color && color.key !== 'black' && <Swatch swatch={color.swatch ?? 'neutral'} size={9} />}
          {it.edition?.signed && <span className="text-[10px] font-bold text-muted">Signé</span>}
        </span>
      </button>
    </li>
  )
}

// Salon : une rangée par personne, les plus voulus d'abord.
// Les autres d'abord, ma rangée (« Toi ») en dernier.
export default function RoomShelves({ items, members, meId, mode, isNew, giftOf, onOpen, onSeeAll }) {
  const word = mode === 'wish' ? 'souhait' : 'disque'
  const others = members.filter((m) => m.id !== meId)
  const me = members.find((m) => m.id === meId)
  const rows = (me ? [...others, me] : others).map((m) => ({ m, list: shelfOf(items, m.id, mode) }))
  const filled = rows.filter((r) => r.list.length > 0)
  const empty = rows.filter((r) => r.list.length === 0)

  return (
    <div className="space-y-8">
      {filled.map(({ m, list }) => {
        const fresh = list.filter((it) => isNew(it)).length
        return (
          <section key={m.id} aria-label={m.id === meId ? 'Mes disques' : `Les disques de ${m.name}`}>
            <div className="flex items-center gap-2.5">
              <Avatar member={m} size={30} ring={false} />
              <h3 className="min-w-0 flex-1 truncate text-base font-bold">
                {m.id === meId ? 'Toi' : m.name}{' '}
                <span className="font-normal text-muted">
                  · {list.length} {word}
                  {list.length > 1 ? 's' : ''}
                </span>
                {fresh > 0 && (
                  <span className="keep-day ml-2 rounded-full bg-coral px-2 py-0.5 align-middle font-mono text-[10px] font-bold text-white">
                    +{fresh}
                  </span>
                )}
              </h3>
              <button
                onClick={() => onSeeAll(m.id)}
                className="shrink-0 rounded-full px-2 py-1 text-sm font-bold text-accent transition hover:bg-raised"
              >
                Tout voir ›
              </button>
            </div>
            <ul className="no-scrollbar -mx-5 mt-3 flex snap-x scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:scroll-px-8 sm:gap-5 sm:px-8 lg:-mx-14 lg:scroll-px-14 lg:px-14">
              {list.slice(0, SHELF_MAX).map((it) => (
                <Mini
                  key={it.id}
                  it={it}
                  mode={mode}
                  isNew={m.id !== meId && isNew(it)}
                  gift={m.id !== meId ? giftOf(it) : null}
                  onOpen={() => onOpen(itemKey(it))}
                />
              ))}
              {list.length > SHELF_MAX && (
                <li className="w-[6.5rem] shrink-0 snap-start sm:w-36">
                  <button
                    onClick={() => onSeeAll(m.id)}
                    className="flex aspect-square w-full flex-col items-center justify-center rounded-md border border-dashed border-line text-sm font-bold text-accent transition hover:border-accent"
                  >
                    <span className="font-display text-2xl">+{list.length - SHELF_MAX}</span>
                    Tout voir
                  </button>
                </li>
              )}
            </ul>
          </section>
        )
      })}

      {empty.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {empty.map(({ m }) => (
            <Avatar key={m.id} member={m} size={22} ring={false} />
          ))}
          {empty.map(({ m }) => (m.id === meId ? 'Toi' : m.name)).join(', ')}{' '}
          {empty.length > 1 ? 'n’ont' : 'n’a'} encore {mode === 'wish' ? 'rien souhaité' : 'aucun disque'} ici.
        </p>
      )}

    </div>
  )
}