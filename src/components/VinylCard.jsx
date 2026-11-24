import EditionTags from './EditionTags'
import { cardTags } from '../lib/edition'
import Cover from './Cover'
import { StarIcon, TrashIcon, NoteIcon, ArrowIcon, PlusIcon, GiftIcon, ShelveIcon } from './Icons'
import { AvatarStack, namesLabel } from './Avatar'
import { discogsUrl, prefetchDetails } from '../lib/discogs'
import { useRef } from 'react'
import { colorFor } from '../lib/palette'
import { ENVIE, envieLabel } from '../lib/envie'
import { t, tn, locale } from '../lib/i18n'

// « oct. 2026 »
const sinceLabel = (iso) =>
  new Date(iso).toLocaleDateString(locale(), { month: 'short', year: 'numeric' })

// vinyl.owners : les membres qui ont ce disque dans le bac affiché
// vinyl.mine   : le disque est dans MA liste (je peux le modifier)
export default function VinylCard({
  vinyl, index, mode, inRoom, meId, gift = null, isNew = false, lentTo = null,
  onOpen, onDelete, onPriority, onNote, onGotIt, onMeToo,
}) {
  const color = colorFor(vinyl)
  // Au survol (après un court instant) ou au toucher, on précharge la fiche
  const hoverTimer = useRef(null)
  // (le disque de la visite guidée n'existe pas sur Discogs)
  const prefetch = () => !vinyl.demo && prefetchDetails(vinyl)
  const startHover = () => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(prefetch, 120)
  }
  const stopHover = () => clearTimeout(hoverTimer.current)
  const owners = vinyl.owners || []
  const shared = inRoom && owners.length > 1
  const editable = vinyl.mine
  const badge = vinyl.demo
    ? t('Démo')
    : shared
    ? mode === 'wish' ? t('Envie commune') : t('En double')
    : vinyl.kind && vinyl.kind !== 'Album' ? vinyl.kind : null

  return (
    <li
      data-tour={vinyl.demo ? 'demo-card' : undefined}
      className="group animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      onPointerEnter={startHover}
      onPointerLeave={stopHover}
      onTouchStart={prefetch}
      onFocus={prefetch}
    >
      <div className="relative cursor-pointer" onClick={onOpen}>
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-transform duration-500 ease-out group-hover:translate-x-[26%] [@media(hover:none)]:translate-x-[12%]"
        >
          <div className="vinyl-disc disc-spin h-full w-full" style={{ '--disc-label': color }} />
        </div>

        <div className="relative overflow-hidden rounded-sm shadow-[0_8px_20px_-10px_rgba(26,22,18,0.6)] ring-1 ring-black/10 transition duration-300 group-hover:-translate-x-1.5 group-hover:-rotate-[1.5deg]">
          <Cover url={vinyl.cover_url} className="aspect-square w-full" />
          {/* « Je l'offre » : jamais visible par la personne à qui on l'offre */}
          {gift && (
            <span
              className={`keep-day absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow ${
                gift === 'mine' ? 'bg-accent text-ink' : 'bg-sun text-paper'
              }`}
            >
              <GiftIcon width={12} height={12} /> {gift === 'mine' ? t('Tu l’offres') : t('Réservé')}
            </span>
          )}
          {badge && (
            <span
              className={`absolute left-0 top-2 px-2 py-0.5 font-mono text-[10px] font-medium uppercase ${
                shared || vinyl.demo ? 'bg-sun text-paper' : 'bg-ink text-paper'
              }`}
            >
              {badge}
            </span>
          )}
          {lentTo && (
            <span className="keep-day absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-[#1b2420]/85 px-2 py-0.5 text-[11px] font-bold text-[#f5f1e8] shadow">
              {t('Chez {name}', { name: lentTo })}
            </span>
          )}
          {isNew && !editable && (
            <span className="keep-day absolute right-2 top-2 rounded-full bg-coral px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white shadow">{t('Nouveau')}</span>
          )}
          {editable && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.() }}
              aria-label={t('Retirer de ma liste')}
              className="absolute right-2 top-2 rounded-full bg-ink/90 p-1.5 text-paper transition before:absolute before:-inset-2 before:content-[''] hover:bg-red-500 hover:text-white focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <TrashIcon width={16} height={16} />
            </button>
          )}
        </div>

      </div>

      <div className="mt-4">
        <button
          onClick={onOpen}
          className="block w-full truncate text-left font-display text-xl font-bold leading-tight transition hover:text-accent"
        >
          {vinyl.title}
        </button>
        <p className="truncate text-sm text-muted">
          {vinyl.artist}
          {vinyl.year && ` · ${vinyl.year}`}
        </p>

        {inRoom && owners.length > 0 && (
          <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <AvatarStack members={owners} size={20} />
            <span className="truncate">
              {mode === 'wish' ? tn(owners.length, '{names} le veut', '{names} le veulent', { names: namesLabel(owners, meId) }) : t('Chez {names}', { names: namesLabel(owners, meId, true) })}
            </span>
          </p>
        )}

        {/* Couleur, signé, numéro… (2 infos au plus) */}
        <EditionTags tags={cardTags(vinyl.edition)} className="mt-1.5" />

        <div className="mt-2 flex items-center justify-between">
          {mode === 'wish' ? (
            editable ? (
              <div className="-ml-0.5 flex" role="group" aria-label={t('Niveau d\'envie')}>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => onPriority?.(vinyl.priority === n ? 0 : n)}
                    aria-label={t('Envie : {v1}', { v1: ENVIE[n] })}
                    title={ENVIE[n]}
                    className={`p-0.5 transition hover:scale-110 active:scale-150 ${
                      n <= vinyl.priority ? 'text-accent' : 'text-line hover:text-accent/60'
                    }`}
                  >
                    <StarIcon filled={n <= vinyl.priority} width={18} height={18} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex text-accent" role="img" aria-label={t('Envie : {envieLabel}', { envieLabel: envieLabel(vinyl.priority) })} title={envieLabel(vinyl.priority)}>
                {Array.from({ length: vinyl.priority }).map((_, i) => (
                  <StarIcon key={i} filled width={18} height={18} />
                ))}
              </div>
            )
          ) : (
            <span className="font-mono text-[11px] text-muted">
              {vinyl.mine && vinyl.owned_at ? `Depuis ${sinceLabel(vinyl.owned_at)}` : ''}
            </span>
          )}

          <div className="flex items-center gap-2.5 text-muted sm:gap-3">
            {mode === 'wish' && editable && (
              <button
                onClick={onGotIt}
                title={t('Je l\'ai eu : passer dans ma collection')}
                aria-label={t('Je l\'ai : passer dans ma collection')}
                className="flex items-center gap-1 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[11px] font-medium transition hover:border-accent hover:bg-accent hover:text-ink"
              >
                <ShelveIcon width={13} height={13} /> <span className="hidden min-[400px]:inline md:inline">{t('Je l\'ai eu')}</span>
              </button>
            )}
            {inRoom && !editable && onMeToo && (
              <button
                onClick={onMeToo}
                title={mode === 'wish' ? t('Ajouter aussi à mes souhaits') : t('Je l\'ai aussi : ajouter à ma collection')}
                aria-label={mode === 'wish' ? t('Moi aussi, ajouter à mes souhaits') : t('Je l\'ai aussi')}
                className="flex items-center gap-1 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[11px] font-medium transition hover:border-accent hover:bg-accent hover:text-ink"
              >
                <PlusIcon width={13} height={13} /> <span className="hidden min-[400px]:inline md:inline">{t('Moi aussi')}</span>
              </button>
            )}
            {editable && (
              <button onClick={onNote} aria-label={t('Ajouter une note')} className="transition hover:text-paper">
                <NoteIcon width={17} height={17} />
              </button>
            )}
            <a
              href={discogsUrl(vinyl)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('Voir sur Discogs')}
              className="transition hover:text-paper"
            >
              <ArrowIcon width={17} height={17} />
            </a>
          </div>
        </div>

        {vinyl.note && (
          <p className="mt-2 line-clamp-2 border-l-4 pl-2 text-xs italic text-muted" style={{ borderColor: color }}>
            {vinyl.note}
          </p>
        )}
      </div>
    </li>
  )
}