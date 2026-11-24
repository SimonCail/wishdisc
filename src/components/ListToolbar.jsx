import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { specialLabel } from '../lib/edition'
import { SORT_OPTIONS } from '../lib/listUtils'
import { SearchIcon, CloseIcon, ShareIcon, CardsIcon, WallIcon, CrateIcon } from './Icons'
import { Avatar } from './Avatar'
import SortSelect from './SortSelect'
import { t } from '../lib/i18n'

const FilterIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" aria-hidden="true" {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
)

function Chip({ active, onClick, children, count, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? 'border-accent bg-accent font-bold text-ink' : 'border-line text-muted hover:border-accent hover:text-paper'
      } ${className}`}
    >
      {children}
      {count != null && <span className={`text-xs ${active ? 'text-ink/60' : 'text-muted/60'}`}>{count}</span>}
    </button>
  )
}

// Personnes d'un salon (+ « en commun »)
function PeopleChips({ members, meId, person, onPerson, sharedCount }) {
  return (
    <>
      {members.map((m) => (
        <Chip key={m.id} active={person === m.id} count={m.count} onClick={() => onPerson(person === m.id ? '' : m.id)}>
          <Avatar member={m} size={20} ring={false} className="-ml-1.5" />
          {m.id === meId ? t('Moi') : m.name}
        </Chip>
      ))}
      {sharedCount > 0 && (
        <Chip active={person === '__shared'} count={sharedCount} onClick={() => onPerson(person === '__shared' ? '' : '__shared')}>{t('En commun')}</Chip>
      )}
    </>
  )
}

// Panneau des filtres qui monte du bas (téléphone).
// On le ferme en touchant à côté, avec « Voir les disques », avec Échap,
// ou en le faisant glisser vers le bas depuis la petite barre (ou le titre).
const CLOSE_DISTANCE = 110 // px à descendre pour fermer
const CLOSE_SPEED = 0.5 // ou un geste rapide (px/ms)

function FilterSheet({ options, sort, onSort, genres, genre, onGenre, specials = [], special, onSpecial, people, hasFilters, onReset, onClose }) {
  const [dy, setDy] = useState(0) // de combien le panneau est descendu
  const [closing, setClosing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function close() {
    setClosing(true)
    setTimeout(onClose, 220) // le temps de le voir descendre
  }

  // --- Glisser vers le bas ---
  function onPointerDown(e) {
    if (e.target.closest('button')) return // « Tout effacer » reste un bouton
    const now = performance.now()
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: now, speed: 0 }
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // le doigt peut sortir de la zone
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
    setDy(Math.max(0, e.clientY - d.startY)) // vers le haut : il ne bouge pas
  }
  function onPointerUp() {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    if (dy > CLOSE_DISTANCE || (d.speed > CLOSE_SPEED && dy > 10)) close()
    else setDy(0) // pas assez : il remonte
  }

  const shift = closing ? '100%' : `${dy}px`
  const fade = closing ? 0 : Math.max(0.15, 1 - dy / 400)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:hidden">
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: fade, transition: dragging ? 'none' : 'opacity 220ms ease' }}
      />
      <div className="sheet-up relative w-full">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Filtres')}
        className="nice-scroll max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
        style={{
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
          className="-mx-5 -mt-3 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing"
        >
        <span aria-hidden="true" className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl font-black uppercase leading-none">{t('Filtres')}</h2>
          {hasFilters && (
            <button onClick={onReset} className="text-sm font-medium text-muted underline-offset-4 hover:text-paper hover:underline">{t('Tout effacer')}</button>
          )}
        </div>

        </div>

        <h3 className="mb-2 mt-6 text-sm font-medium text-muted">{t('Trier par')}</h3>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip key={o.value} active={sort === o.value} onClick={() => onSort(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>

        {genres.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-medium text-muted">{t('Genre')}</h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <Chip key={g.name} active={genre === g.name} count={g.count} onClick={() => onGenre(genre === g.name ? '' : g.name)}>
                  {g.name}
                </Chip>
              ))}
            </div>
          </>
        )}

        {specials.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-medium text-muted">{t('Particularités')}</h3>
            <div className="flex flex-wrap gap-2">
              {specials.map((x) => (
                <Chip key={x.name} active={special === x.name} count={x.count} onClick={() => onSpecial(special === x.name ? '' : x.name)}>
                  {x.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {people && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-medium text-muted">{t('À qui')}</h3>
            <div className="flex flex-wrap gap-2">{people}</div>
          </>
        )}

        <button
          onClick={close}
          className="mt-8 w-full rounded-full bg-accent py-3.5 text-sm font-bold text-ink transition hover:bg-accent-soft"
        >{t('Voir les disques')}</button>
      </div>
      </div>
    </div>
  )
}

// Recherche, tri, genres et personnes.
// Téléphone : une barre accrochée en haut (recherche + « Filtres ») et une
// ligne de genres qui défile sur le côté ; le reste dans le panneau du bas.
// Ordinateur : tout est visible.
// placeholder : où on cherche (« Chercher dans mes souhaits »), pour ne pas
// confondre avec la barre « Ajouter un disque » du haut
export default function ListToolbar({
  search, onSearch, sort, onSort,
  genres = [], genre, onGenre, specials = [], special = '', onSpecial, person, onPerson,
  members, meId, sharedCount = 0, mode,
  hasFilters, onReset, onShare, shareDisabled = false, placeholder = t('Chercher dans la liste'),
  view = 'list', onView, onCrate,
}) {
  const [sheet, setSheet] = useState(false)
  // La priorité n'a de sens que pour les souhaits
  const options = SORT_OPTIONS.filter((o) => mode !== 'owned' || o.value !== 'priority')
  const showPeople = members && members.length > 1
  const activeCount = (genre ? 1 : 0) + (special ? 1 : 0) + (person ? 1 : 0) + (sort !== options[0]?.value ? 1 : 0)
  const people = showPeople ? (
    <PeopleChips members={members} meId={meId} person={person} onPerson={onPerson} sharedCount={sharedCount} />
  ) : null

  const searchField = (
    <div className="relative min-w-0 flex-1">
      <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={`${placeholder}…`}
        aria-label={placeholder}
        enterKeyHint="search"
        className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent"
      />
      {search && (
        <button
          onClick={() => onSearch('')}
          aria-label={t('Effacer')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-paper"
        >
          <CloseIcon width={14} height={14} />
        </button>
      )}
    </div>
  )

  return (
    // Téléphone : toute la barre reste accrochée sous la barre du haut pendant qu'on fait défiler
    <div className="sticky top-16 z-20 -mx-5 mb-6 border-b border-line/60 bg-ink/90 px-5 py-3 backdrop-blur-md sm:static sm:mx-0 sm:mb-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {/* --- Téléphone --- */}
      <div className="space-y-2.5 sm:hidden">
        {/* Le champ de recherche dans la liste, et le bouton des filtres à côté */}
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={`${placeholder}…`}
              aria-label={placeholder}
              enterKeyHint="search"
              className="h-11 w-full rounded-2xl border border-line bg-surface pl-10 pr-10 text-base outline-none transition placeholder:text-muted/70 focus:border-accent"
            />
            {search && (
              <button
                onClick={() => onSearch('')}
                aria-label={t('Effacer')}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-paper"
              >
                <CloseIcon width={15} height={15} />
              </button>
            )}
          </div>
          <button
            onClick={() => setSheet(true)}
            aria-label={activeCount ? t('Filtres ({activeCount} actifs)', { activeCount }) : t('Filtres et tri')}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
              activeCount ? 'border-accent bg-accent text-ink' : 'border-line bg-surface text-paper'
            }`}
          >
            <FilterIcon />
            {activeCount > 0 && (
              <span className="keep-day absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 font-mono text-[10px] font-bold leading-none text-white">
                {activeCount}
              </span>
            )}
          </button>
          {/* Affichage : cartes, mur de pochettes, ou fouiller le bac (petit menu) */}
          {onView && <ViewMenu view={view} onView={onView} onCrate={onCrate} />}
          {/* Partager la liste affichée (sur ordinateur : à droite des onglets) */}
          {onShare && (
            <button
              onClick={onShare}
              disabled={shareDisabled}
              aria-label={t('Partager la liste')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-paper transition disabled:opacity-40"
            >
              <ShareIcon width={18} height={18} />
            </button>
          )}
        </div>
        {/* Les filtres choisis dans le panneau, pour les retirer d'un geste */}
        {(genre || special || person) && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {genre && (
              <Chip active onClick={() => onGenre('')}>
                {genre} <CloseIcon width={12} height={12} />
              </Chip>
            )}
            {special && (
              <Chip active onClick={() => onSpecial('')}>
                {specialLabel(special)} <CloseIcon width={12} height={12} />
              </Chip>
            )}
            {person && (
              <Chip active onClick={() => onPerson('')}>
                {person === '__shared' ? t('En commun') : person === meId ? t('Moi') : members?.find((m) => m.id === person)?.name ?? t('Personne')}{' '}
                <CloseIcon width={12} height={12} />
              </Chip>
            )}
          </div>
        )}
      </div>

      {/* --- Ordinateur --- */}
      <div className="hidden space-y-4 sm:block">
        <div className="flex gap-2">
          {searchField}
          {onView && (
            <div role="group" aria-label={t('Affichage')} className="flex shrink-0 overflow-hidden rounded-2xl border border-line bg-surface">
              {[
                ['list', t('Liste'), CardsIcon],
                ['wall', t('Mur'), WallIcon],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => onView(value)}
                  aria-pressed={view === value}
                  className={`flex items-center gap-1.5 px-3.5 text-sm transition ${
                    view === value ? 'keep-day bg-accent font-bold text-ink' : 'text-muted hover:text-paper'
                  }`}
                >
                  <Icon width={16} height={16} /> {label}
                </button>
              ))}
            </div>
          )}
          {onCrate && (
            <button
              onClick={onCrate}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 text-sm transition hover:border-accent"
            >
              <CrateIcon width={16} height={16} /> {t('Fouiller')}
            </button>
          )}
          <SortSelect value={sort} options={options} onChange={onSort} />
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Chip active={!genre} onClick={() => onGenre('')}>{t('Tous les genres')}</Chip>
            {genres.map((g) => (
              <Chip key={g.name} active={genre === g.name} count={g.count} onClick={() => onGenre(genre === g.name ? '' : g.name)}>
                {g.name}
              </Chip>
            ))}
          </div>
        )}
        {specials.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {specials.map((x) => (
              <Chip key={x.name} active={special === x.name} count={x.count} onClick={() => onSpecial(special === x.name ? '' : x.name)}>
                {x.label}
              </Chip>
            ))}
          </div>
        )}
        {showPeople && <div className="flex flex-wrap items-center gap-2">{people}</div>}
        {hasFilters && (
          <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-muted transition hover:text-paper">
            <CloseIcon width={14} height={14} />{' '}{t('Réinitialiser les filtres')}</button>
        )}
      </div>

      {sheet && createPortal(
        <FilterSheet
          options={options}
          sort={sort}
          onSort={onSort}
          genres={genres}
          genre={genre}
          onGenre={onGenre}
          specials={specials}
          special={special}
          onSpecial={onSpecial}
          people={people}
          hasFilters={hasFilters || sort !== options[0]?.value}
          onReset={() => {
            onReset()
            onSort(options[0]?.value)
          }}
          onClose={() => setSheet(false)}
        />,
        document.body
      )}
    </div>
  )
}
// Téléphone : un seul bouton « Affichage » qui ouvre un petit menu
function ViewMenu({ view, onView, onCrate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open, setOpen])
  const items = [
    ['list', t('Cartes'), CardsIcon, () => onView('list')],
    ['wall', t('Mur de pochettes'), WallIcon, () => onView('wall')],
    ...(onCrate ? [['crate', t('Fouiller le bac'), CrateIcon, onCrate]] : []),
  ]
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('Affichage')}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
          view === 'wall' ? 'border-accent bg-accent text-ink' : 'border-line bg-surface text-paper'
        }`}
      >
        {view === 'wall' ? <WallIcon width={18} height={18} /> : <CardsIcon width={18} height={18} />}
      </button>
      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-12 z-30 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          {items.map(([id, label, Icon, run]) => (
            <button
              key={id}
              role="menuitem"
              onClick={() => {
                setOpen(false)
                run()
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-raised ${
                view === id ? 'font-bold text-accent' : ''
              }`}
            >
              <Icon width={18} height={18} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}