import { useEffect, useState } from 'react'
import { Avatar } from './Avatar'
import { ThemeToggle } from './ThemePicker'
import { FriendsIcon } from './Friends'
import { t } from '../lib/i18n'

// --- Icônes de navigation ---
const base = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}
export const RecordIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 6.5a5.5 5.5 0 0 0-5.5 5.5" opacity=".55" />
  </svg>
)
export const RoomsIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="7" width="11" height="11" rx="2.2" />
    <path d="M7 4h11a3 3 0 0 1 3 3v11" />
  </svg>
)
export const ChatIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 12.5a7.5 7.5 0 0 1-11.2 6.5L4 20l1.1-4.2A7.5 7.5 0 1 1 20 12.5z" />
  </svg>
)

export const ShopIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
    <path d="M5.5 11.5V20h13v-8.5" />
    <circle cx="12" cy="16" r="2.2" />
  </svg>
)

export const NAV = [
  { name: 'home', label: t('Ma liste'), Icon: RecordIcon },
  { name: 'rooms', label: t('Salons'), Icon: RoomsIcon },
  { name: 'friends', label: t('Amis'), Icon: FriendsIcon },
  { name: 'shops', label: t('Disquaires'), Icon: ShopIcon },
  { name: 'messages', label: t('Messages'), Icon: ChatIcon },
]
// Page → onglet allumé
export const sectionOf = (route) =>
  ({ home: 'home', rooms: 'rooms', room: 'rooms', friends: 'friends', friend: 'friends', messages: 'messages', chat: 'messages', shops: 'shops' })[
    route
  ] ?? 'home'

function Badge({ count, className = '' }) {
  if (!count) return null
  return (
    <span
      className={`keep-day flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 font-mono text-[10px] font-bold leading-none text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Le disque Wishdisc : vinyle noir, sillon jaune, étiquette corail avec l'étoile des souhaits
export function BrandMark({ size = 32, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="48" fill="#1b2420" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#f5f1e8" strokeOpacity=".16" strokeWidth="1.6" />
      <path d="M 50 12.5 A 37.5 37.5 0 0 1 85.7 61.6" fill="none" stroke="#f1c04e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="17" fill="#ec5b3e" />
      <path
        d="M50 39.5L52.6 46.3L59.9 46.7L54.2 51.3L56.1 58.4L50 54.4L43.9 58.4L45.8 51.3L40.1 46.7L47.4 46.3Z"
        fill="#f5f1e8"
        stroke="#f5f1e8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Logo : le disque fait un tour à chaque changement de page
function Logo({ spinKey, onClick }) {
  return (
    <button onClick={onClick} aria-label={t('Wishdisc : ma liste')} className="group flex items-center gap-2.5">
      <span key={spinKey} className="logo-spin block shrink-0">
        <BrandMark size={32} />
      </span>
      <span className="font-display text-[1.35rem] font-black uppercase leading-none tracking-tight">Wish<span className="opacity-70">disc</span>
      </span>
    </button>
  )
}

// Barre du haut, toujours visible
export function TopBar({ section, spinKey, badges, me, onNavigate, onProfile }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`sticky top-0 z-30 bg-accent text-ink transition-shadow ${
        scrolled ? 'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]' : ''
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[88rem] items-center gap-4 px-5 sm:px-8 lg:px-14">
        <Logo spinKey={spinKey} onClick={() => onNavigate('home')} />

        {/* Navigation (ordinateur) */}
        <nav aria-label={t('Navigation')} className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map(({ name, label }) => {
            const active = section === name
            return (
              <button
                key={name}
                data-tour={`nav-${name}`}
                onClick={() => onNavigate(name)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-ink text-accent' : 'text-ink/80 hover:bg-ink/10 hover:text-ink'
                }`}
              >
                {label}
                <Badge count={badges[name]} />
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 md:ml-3">
          <ThemeToggle />
          <button
            onClick={onProfile}
            aria-label={t('Mon profil')}
            title={t('Mon profil')}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-ink/50 transition hover:scale-105 hover:ring-ink"
          >
            <Avatar member={me} size={40} ring={false} className="block" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Onglets du bas (téléphone)
// Barre d'onglets du téléphone : flottante, arrondie, au-dessus de la barre blanche de l'iPhone.
// L'onglet actif est posé sur une pastille de couleur qui glisse d'un onglet à l'autre.
export function TabBar({ section, badges, onNavigate }) {
  const index = Math.max(0, NAV.findIndex((n) => n.name === section))
  return (
    <nav
      aria-label={t('Navigation')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{
        paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      <div className="pointer-events-auto relative mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] border border-line/70 bg-surface/80 p-1.5 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] backdrop-blur-xl backdrop-saturate-150">
        {/* La pastille de l'onglet actif */}
        <span
          aria-hidden="true"
          className="tab-marker absolute bottom-1.5 left-1.5 top-1.5 rounded-[1.375rem] bg-accent shadow-[0_6px_16px_-6px_var(--color-accent)]"
          style={{ width: `calc((100% - 0.75rem) / ${NAV.length})`, transform: `translateX(${index * 100}%)` }}
        />
        {NAV.map(({ name, label, Icon }) => {
          const active = section === name
          return (
            <button
              key={name}
              data-tour={`nav-${name}`}
              onClick={() => onNavigate(name)}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex h-[3.375rem] flex-col items-center justify-center gap-0.5 rounded-[1.375rem] text-[11px] leading-none transition-[color,transform] duration-300 active:scale-90 ${
                active ? 'keep-day font-bold text-ink' : 'font-medium text-muted hover:text-paper'
              }`}
            >
              <span className={`relative transition-transform duration-300 ${active ? '-translate-y-px scale-110' : ''}`}>
                <Icon />
                <Badge count={badges[name]} className="absolute -right-3 -top-2 ring-2 ring-surface" />
              </span>
              <span className="mt-0.5">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// En-tête court des pages (salon, ami, salons, amis, messages)
// media : image à gauche (pochette, avatar) ; actions : boutons à droite ;
// discColor : étiquette du vinyle qui dépasse à droite
// back : { label, onClick } pour un bouton « ‹ Salons » au-dessus du titre
export function PageHeader({ title, subtitle, media, actions, back, discColor = '#ec5b3e', children }) {
  return (
    <header className="relative overflow-hidden bg-accent text-ink">
      <div
        aria-hidden="true"
        className="vinyl-disc animate-disc pointer-events-none absolute -right-28 top-1/2 h-[22rem] w-[22rem] -translate-y-1/2 opacity-25 sm:-right-20 sm:opacity-100"
        style={{ '--disc-label': discColor }}
      />
      <div className={`page-in relative mx-auto max-w-[88rem] px-5 pb-8 sm:px-8 sm:pb-10 lg:px-14 ${back ? 'pt-3 sm:pt-5' : 'pt-6 sm:pt-8'}`}>
        {back && (
          <button
            onClick={back.onClick}
            className="-ml-2 mb-3 flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-bold text-ink/80 transition hover:bg-ink/10 hover:text-ink sm:mb-4"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {back.label}
          </button>
        )}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          {media && <div className="shrink-0">{media}</div>}
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="font-display break-words text-[clamp(2.6rem,9vw,4.75rem)] font-black uppercase leading-[0.86]">
              {title}
            </h1>
            {subtitle && <div className="mt-3 text-sm text-ink/80 sm:text-base">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 sm:mr-40 lg:mr-56">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  )
}

// Bouton posé sur l'en-tête coloré
export const headerBtn =
  'flex items-center gap-1.5 rounded-full border border-ink/40 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink hover:text-accent'
export const headerBtnSolid =
  'flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-accent transition hover:bg-ink/85'