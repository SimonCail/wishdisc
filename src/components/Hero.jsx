import { Avatar, AvatarStack } from './Avatar'
import SpinningDisc from './SpinningDisc'
import { RoomCover, roomColor } from './Rooms'
import { usePlayer, toggle } from '../lib/player'
import { BrandMark } from './Layout'
import { t } from '../lib/i18n'

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
)
// Petites barres qui dansent pendant la lecture
const Bars = () => (
  <span aria-hidden="true" className="eq flex h-3 items-end gap-[2px]">
    <span /><span /><span />
  </span>
)

// Le disque posé sur la platine, avec lecture des extraits (si le son est activé)
function NowSpinning({ disc }) {
  const player = usePlayer()
  if (!disc?.title) return null
  const album = { key: disc.key ?? `${disc.artist}|${disc.title}`, title: disc.title, artist: disc.artist, cover_url: disc.cover_url }
  const current = player.album?.key === album.key
  const playing = current && (player.status === 'playing' || player.status === 'loading')
  const track = current ? player.tracks[player.index] : null

  return (
    <div className="animate-fade-up mt-5 flex max-w-md items-center gap-3" style={{ animationDelay: '220ms' }}>
      {player.enabled && disc.artist && (
        <button
          onClick={() => toggle(album)}
          data-player-control
          aria-label={playing ? t('Mettre en pause') : t('Écouter {title}', { title: disc.title })}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-accent shadow-lg transition hover:scale-105"
        >
          {current && player.status === 'loading' ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          ) : playing ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>
      )}
      <p className="min-w-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/70">
        <span className="flex items-center gap-2">
          {playing && player.status === 'playing' ? (
            <Bars />
          ) : (
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-shimmer rounded-full bg-coral" />
          )}
          <span className="truncate">{t('Sur la platine · {title}', { title: disc.title })}{disc.artist && ` — ${disc.artist}`}
          </span>
        </span>
        {current && track && (
          <span className="mt-1 block truncate normal-case tracking-normal text-ink/85">
            {track.title} <span className="text-ink/55">{t('· extrait {i}/{total}', { i: player.index + 1, total: player.tracks.length })}</span>
          </span>
        )}
        {current && player.status === 'waiting' && (
          <span className="mt-1 block normal-case tracking-normal text-ink/60">{t('Touche l’écran pour lancer la musique.')}</span>
        )}
        {current && player.status === 'unavailable' && (
          <span className="mt-1 block normal-case tracking-normal text-ink/60">{t('Pas d’extrait trouvé pour cet album.')}</span>
        )}
      </p>
    </div>
  )
}

// Version courte pour le bandeau réduit sur téléphone : une pastille avec la pochette
// du disque sur la platine. Si le son est activé, la toucher lance l'extrait.
function NowChip({ disc, name }) {
  const player = usePlayer()
  if (!disc?.title) {
    return (
      <p className="animate-fade-up mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/65" style={{ animationDelay: '120ms' }}>{t('La liste de {name}', { name })}</p>
    )
  }
  const album = { key: disc.key ?? `${disc.artist}|${disc.title}`, title: disc.title, artist: disc.artist, cover_url: disc.cover_url }
  const current = player.album?.key === album.key
  const playing = current && player.status === 'playing'
  const loading = current && player.status === 'loading'
  const canPlay = player.enabled && !!disc.artist

  const inner = (
    <>
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ink/80 ring-2 ring-ink/20">
        {disc.cover_url ? (
          <img src={disc.cover_url} alt="" className={`h-full w-full object-cover ${playing ? 'animate-[spin_6s_linear_infinite]' : ''}`} />
        ) : null}
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-[13px] font-bold">{disc.title}</span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink/65">
          {disc.artist ? disc.artist : t('Sur la platine')}
        </span>
      </span>
      {canPlay && (
        <span className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-accent">
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          ) : playing ? (
            <Bars />
          ) : (
            <PlayIcon />
          )}
        </span>
      )}
    </>
  )
  const cls = 'animate-fade-up mt-3 flex max-w-[16.5rem] items-center gap-2.5 rounded-full bg-ink/10 py-1 pl-1 backdrop-blur-sm'
  return canPlay ? (
    <button
      onClick={() => toggle(album)}
      data-player-control
      aria-label={playing ? t('Mettre en pause') : t('Écouter {title}', { title: disc.title })}
      className={`${cls} pr-1 transition active:scale-[0.97]`}
      style={{ animationDelay: '120ms' }}
    >
      {inner}
    </button>
  ) : (
    <div className={`${cls} pr-4`} style={{ animationDelay: '120ms' }}>{inner}</div>
  )
}

// En-tête : platine animée + titre affiche. Le texte s'adapte à l'espace affiché.
// disc : { cover_url, title, artist } du disque choisi dans le profil (sinon étiquette classique).
// Dans un salon, l'étiquette prend la couleur du salon.
// dense : sur téléphone, bandeau réduit pour voir ses disques tout de suite (liste déjà remplie)
export default function Hero({ count, context, topRight, compact = false, dense = false, disc = null }) {
  const isRoom = context?.kind === 'room'
  const isMe = context?.kind === 'me'
  const isFriend = context?.kind === 'friend'
  const player = usePlayer()
  const discKey = disc ? disc.key ?? `${disc.artist}|${disc.title}` : null
  // 33 tours/minute pendant l'écoute, sinon rotation lente de décor
  const spinning = discKey && player.album?.key === discKey && player.status === 'playing'

  return (
    <header className="relative overflow-hidden bg-accent text-ink">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 sm:-right-28 sm:h-[38rem] sm:w-[38rem] sm:opacity-100 ${
          dense ? '-right-20 h-[15rem] w-[15rem] opacity-80' : '-right-52 h-[30rem] w-[30rem] opacity-30'
        }`}
      >
        <SpinningDisc
          cover={disc?.cover_url}
          color={isRoom ? roomColor(context) : context?.kind === 'friend' ? context.friend.color || '#ec5b3e' : '#ec5b3e'}
          className={`hero-platter h-full w-full ${spinning ? 'is-playing' : ''}`}
        />
        <svg viewBox="0 0 100 100" fill="none" className="absolute inset-0 h-full w-full overflow-visible">
          <g className="needle">
            <line x1="76" y1="16" x2="62" y2="70" stroke="#e9e3d3" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="59" y="68" width="6" height="9" rx="1.2" fill="#e9e3d3" transform="rotate(14 62 70)" />
            <rect x="73.5" y="6.5" width="5" height="8" rx="1.5" fill="#e9e3d3" transform="rotate(14 76 16)" />
          </g>
          <circle cx="76" cy="16" r="4.2" fill="#1b2420" stroke="#e9e3d3" strokeWidth="1.2" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[88rem] sm:px-8 lg:px-14 px-5">
        {topRight ? (
          <div className="flex items-center justify-between gap-3 py-4">
            {/* Le nom de l'app (écran d'accueil sans compte) */}
            <span className="flex items-center gap-2.5">
              <BrandMark size={34} />
              <span className="font-display text-[1.35rem] font-black uppercase leading-none tracking-tight">Wish<span className="opacity-70">disc</span>
              </span>
            </span>
            <div className="ml-auto">{topRight}</div>
          </div>
        ) : (
          <div className="h-2" />
        )}

        <div className={compact ? 'pb-20 pt-10 sm:pb-24 sm:pt-16' : dense ? 'pb-6 pt-4 sm:pb-28 sm:pt-16' : 'pb-16 pt-8 sm:pb-28 sm:pt-16'}>
          {isRoom ? (
            <>
              <p className="animate-fade-up mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
                <RoomCover room={context} size={30} className="ring-2 ring-ink/40" />
                <span className="min-w-0 truncate">{t('Salon · {name}', { name: context.name })}</span>
                <AvatarStack members={context.members} size={24} />
              </p>
              <h1 className="font-display animate-fade-up text-[clamp(3.5rem,14vw,9.5rem)] xl:text-[clamp(9.5rem,10vw,12.5rem)] font-black uppercase leading-[0.84]">{t('Les disques')}<br />{t('qu\'on veut.')}</h1>
              <p className="animate-fade-up mt-6 max-w-sm text-ink/80 lg:max-w-md lg:text-lg" style={{ animationDelay: '120ms' }}>{t('Vos souhaits et vos collections, réunis. Chacun garde sa liste perso, ici on voit tout ensemble.')}</p>
              <NowSpinning disc={disc} />
            </>
          ) : isFriend ? (
            <>
              <p className="animate-fade-up mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
                <Avatar member={context.friend} size={30} className="ring-2 ring-ink/40" />
                <span className="min-w-0 truncate">{t('Chez un·e ami·e')}</span>
              </p>
              <h1 className="font-display animate-fade-up break-words text-[clamp(3.5rem,14vw,9.5rem)] xl:text-[clamp(9.5rem,10vw,12.5rem)] font-black uppercase leading-[0.84]">{t('Chez')}<br />
                {context.friend.name}.
              </h1>
              <p className="animate-fade-up mt-6 max-w-sm text-ink/80 lg:max-w-md lg:text-lg" style={{ animationDelay: '120ms' }}>{t('Ses souhaits et sa collection. Une idée de cadeau, ou un disque à ajouter à ta propre liste.')}</p>
              <NowSpinning disc={disc} />
            </>
          ) : isMe ? (
            <>
              {/* Sur téléphone, bandeau réduit : titre + pastille du disque sur la platine (le nombre est sur les onglets) */}
              <p className={`animate-fade-up mb-4 font-mono text-xs uppercase tracking-[0.15em] text-ink/70 ${dense ? 'hidden sm:block' : ''}`}>{t('Ma liste · {name}', { name: context.me.name })}</p>
              <h1
                className={`font-display animate-fade-up font-black uppercase leading-[0.84] xl:text-[clamp(9.5rem,10vw,12.5rem)] ${
                  dense ? 'text-[2.6rem] sm:text-[clamp(3.5rem,14vw,9.5rem)]' : 'text-[clamp(3.5rem,14vw,9.5rem)]'
                }`}
              >{t('Mes')}{dense ? <span className="sm:hidden"> </span> : null}<br className={dense ? 'hidden sm:block' : undefined} />{t('disques.')}</h1>
              {dense && (
                <div className="sm:hidden">
                  <NowChip disc={disc} name={context.me.name} />
                </div>
              )}
              <p
                className={`animate-fade-up mt-6 max-w-sm text-ink/80 lg:max-w-md lg:text-lg ${dense ? 'hidden sm:block' : ''}`}
                style={{ animationDelay: '120ms' }}
              >{t('Ce que tu veux, ce que tu as déjà. Ta liste te suit dans tous les salons que tu rejoins.')}</p>
              <div className={dense ? 'hidden sm:block' : undefined}>
                <NowSpinning disc={disc} />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display animate-fade-up text-[clamp(3.5rem,14vw,9.5rem)] xl:text-[clamp(9.5rem,10vw,12.5rem)] font-black uppercase leading-[0.84]">{t('Les disques')}<br />{t('qu\'on veut.')}</h1>
              <p className="animate-fade-up mt-6 max-w-sm text-ink/80 lg:max-w-md lg:text-lg" style={{ animationDelay: '120ms' }}>{t('Ta liste de souhaits et ta collection de vinyles. Rejoins le salon d\'un proche pour tout mettre en commun.')}</p>
            </>
          )}
        </div>
      </div>
    </header>
  )
}