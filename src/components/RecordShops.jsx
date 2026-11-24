import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PinIcon, SearchIcon } from './Icons'
import { btn } from '../lib/ui'
import { directionsUrl, distance, findShops, formatDistance, geocode, lastPosition, openState, savePosition } from '../lib/recordShops'
import { currentLang, locale, t, tn } from '../lib/i18n'


// Fond de carte : les images d'OpenStreetMap (légères, elles s'affichent tout de suite),
// adoucies en CSS (voir .osm-tiles dans index.css), et assombries la nuit.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
// Sans aucune position connue : la France entière, le temps de chercher
const START = { lat: 46.6, lon: 2.4, zoom: 5 }

// 600 → « 10 h » en français, « 10:00 AM » ailleurs
function clock(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (currentLang() === 'fr') return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' })
}

function hoursLabel(state) {
  if (!state) return null
  if (state.open) return state.until == null ? t('Ouvert') : t('Ouvert jusqu’à {time}', { time: clock(state.until) })
  if (!state.next) return t('Fermé')
  const { inDays, at, day } = state.next
  if (inDays === 0) return t('Fermé · ouvre à {time}', { time: clock(at) })
  if (inDays === 1) return t('Fermé · ouvre demain à {time}', { time: clock(at) })
  const name = new Date(2024, 0, 1 + day).toLocaleDateString(locale(), { weekday: 'long' }) // 1er janvier 2024 = lundi
  return t('Fermé · ouvre {day} à {time}', { day: name, time: clock(at) })
}

// À pied : environ 80 m par minute
const walk = (m) => Math.max(1, Math.round(m / 80))

// Repères numérotés (1 = le plus proche), le choisi en jaune avec son nom
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const pin = (n, on, name) =>
  L.divIcon({
    className: '',
    iconSize: on ? [34, 34] : [26, 26],
    iconAnchor: on ? [17, 17] : [13, 13],
    html: `<span class="shop-pin${on ? ' on' : ''}">${n}</span>${on ? `<span class="shop-pin-label">${esc(name)}</span>` : ''}`,
  })
const meIcon = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<span class="me-dot"></span>' })
const placeIcon = L.divIcon({ className: '', iconSize: [30, 40], iconAnchor: [15, 38], html: '<span class="place-pin"></span>' })

// Petites icônes des boutons
const I = {
  route: <path d="M12 3 4.5 20.2 12 16.4l7.5 3.8z" />,
  phone: <path d="M5 4h3.5l1.6 4.2-2.2 1.4a11 11 0 0 0 6.5 6.5l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4z" />,
  web: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.3 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.3-3.4-8.5s1-6.1 3.4-8.5z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      <circle cx="12" cy="12" r="7" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.7" />
      <path d="m9 21 2.5-7.5M14 21l-1.5-5.5-2-2 .8-4.5L15 11l2.5 1M11.3 9 8 10.5 7 14" />
    </>
  ),
}
const Ico = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

// « Disquaires » (onglet de la navigation) : la carte autour de moi ou d'un endroit cherché,
// la fiche du magasin choisi avec les souhaits à y chercher, et les 3 plus proches.
const NEAREST = 3

export default function RecordShops() {
  // ma position { lat, lon } : la dernière connue tout de suite, puis celle du GPS
  const [me, setMe] = useState(lastPosition)
  const [place, setPlace] = useState(null) // endroit cherché { lat, lon, title }
  const [stage, setStage] = useState(() => (lastPosition() ? 'loading' : 'locating')) // locating | denied | loading | error | ready
  const [shops, setShops] = useState([])
  const [selected, setSelected] = useState(null)
  const mapEl = useRef(null)
  const map = useRef(null)
  const tiles = useRef(null)
  const layer = useRef(null)
  const centerMark = useRef(null)
  const [retry, setRetry] = useState(0)
  const framedFor = useRef('')
  const where = place || me // le point de départ des recherches

  // 1. Où suis-je ?
  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStage('denied')
      return
    }
    setStage((s) => (s === 'ready' || s === 'loading' ? s : 'locating'))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        savePosition(next)
        // à moins de 300 m de la position déjà affichée : on ne relance rien
        setMe((cur) => (cur && distance(cur, next) < 300 ? cur : next))
      },
      () => setStage((s) => (s === 'locating' ? 'denied' : s)),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    )
  }, [])
  useEffect(() => {
    locate()
  }, [locate])

  // 2. Les disquaires autour du point de départ
  useEffect(() => {
    if (!where) return
    let alive = true
    setStage('loading')
    // Les disquaires trouvés en plus (recherche complète, en arrière-plan) s'ajoutent sans tout bouger
    const onMore = (more) => alive && setShops(more)
    findShops(where, onMore)
      .then((list) => {
        if (!alive) return
        setShops(list)
        setSelected(list[0]?.id ?? null)
        setStage('ready')
      })
      .catch(() => alive && setStage('error'))
    return () => {
      alive = false
    }
  }, [where?.lat, where?.lon, retry]) // eslint-disable-line react-hooks/exhaustive-deps

  // 3. La carte : affichée tout de suite (dernière position connue), créée une seule fois
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true, fadeAnimation: false }).setView(
      where ? [where.lat, where.lon] : [START.lat, START.lon],
      where ? 14 : START.zoom,
    )
    m.attributionControl.setPrefix(false)
    m.attributionControl.addAttribution(ATTRIBUTION)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    // La taille du bloc n'est connue qu'après l'affichage
    setTimeout(() => m.invalidateSize(), 0)
    return () => {
      m.remove()
      map.current = null
      tiles.current = null
      centerMark.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Le fond (une seule couche) ; la nuit, un filtre CSS l'assombrit
  useEffect(() => {
    const m = map.current
    if (!m || tiles.current) return
    tiles.current = L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION, className: 'osm-tiles', keepBuffer: 4 }).addTo(m)
  }, [])

  // Le point de départ : moi (point bleu) ou l'endroit cherché (épingle)
  useEffect(() => {
    const m = map.current
    if (!m || !where) return
    if (framedFor.current !== `${where.lat},${where.lon}`) m.setView([where.lat, where.lon], 14, { animate: false })
    centerMark.current?.remove()
    centerMark.current = L.marker([where.lat, where.lon], {
      icon: place ? placeIcon : meIcon,
      keyboard: false,
      interactive: false,
      zIndexOffset: -100,
    }).addTo(m)
  }, [where?.lat, where?.lon, !!place]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current
    if (!m || !layer.current) return
    layer.current.clearLayers()
    shops.forEach((s, i) => {
      const on = s.id === selected
      L.marker([s.lat, s.lon], { icon: pin(i + 1, on, s.name), zIndexOffset: on ? 1000 : 0, title: s.name, keyboard: false, riseOnHover: true })
        .on('click', () => {
          // Des magasins collés les uns aux autres : on zoome d'abord, sinon le tap tombe sur le voisin
          const here = m.latLngToContainerPoint([s.lat, s.lon])
          const crowded = shops.some((o) => o.id !== s.id && here.distanceTo(m.latLngToContainerPoint([o.lat, o.lon])) < 34)
          if (crowded && m.getZoom() < 18) m.setView([s.lat, s.lon], Math.min(m.getZoom() + 2, 18))
          else setSelected(s.id)
        })
        .addTo(layer.current)
    })
  }, [shops, selected])

  // Cadrer à chaque nouvelle recherche : le point de départ + les 3 plus proches
  useEffect(() => {
    const m = map.current
    if (!m || stage !== 'ready' || !where) return
    const key = `${where.lat},${where.lon}`
    if (framedFor.current === key) return
    framedFor.current = key
    if (!shops.length) return m.setView([where.lat, where.lon], 13)
    const pts = [[where.lat, where.lon], ...shops.slice(0, NEAREST).map((s) => [s.lat, s.lon])]
    m.fitBounds(pts, { padding: [50, 50], maxZoom: 16 })
  }, [shops, stage, where])

  function choose(s) {
    setSelected(s.id)
    map.current?.setView([s.lat, s.lon], Math.max(map.current.getZoom(), 16), { animate: true })
    // sur téléphone, on remonte voir la carte et la fiche
    if (window.matchMedia('(max-width: 1023px)').matches) mapEl.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const index = shops.findIndex((s) => s.id === selected)
  const shop = shops[index]
  const nearest = shops.slice(0, NEAREST)
  const ctl = 'flex h-10 w-10 items-center justify-center bg-surface/95 text-paper backdrop-blur transition hover:bg-raised'

  return (
    <section aria-label={t('Disquaires autour de moi')} className="space-y-4">
      <PlaceSearch
        near={me}
        place={place}
        located={!!me}
        onPick={(p) => setPlace(p)}
        onMe={() => {
          setPlace(null)
          locate()
        }}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-5">
        {/* La carte */}
        <div className="relative h-[48vh] scroll-mt-20 overflow-hidden rounded-3xl border border-line bg-raised shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)] lg:h-[34rem]">
          <div ref={mapEl} className="shop-map absolute inset-0 z-0" />

          {stage === 'ready' && shops.length > 0 && (
            <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-5rem)] truncate rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur">
              {place
                ? tn(shops.length, '{n} disquaire à moins de 30 km de {place}', '{n} disquaires à moins de 30 km de {place}', { place: place.title })
                : tn(shops.length, '{n} disquaire à moins de 30 km', '{n} disquaires à moins de 30 km')}
            </div>
          )}

          {/* Zoom et « revenir au point de départ » */}
          {(

            <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
              <div className="flex flex-col overflow-hidden rounded-2xl border border-line shadow-md">
                <button onClick={() => map.current?.zoomIn()} aria-label={t('Zoomer')} className={`${ctl} border-b border-line`}>
                  <Ico d={I.plus} />
                </button>
                <button onClick={() => map.current?.zoomOut()} aria-label={t('Dézoomer')} className={ctl}>
                  <Ico d={I.minus} />
                </button>
              </div>
              <button
                onClick={() => where && map.current?.setView([where.lat, where.lon], 15, { animate: true })}
                aria-label={place ? t('Revenir sur l’endroit cherché') : t('Revenir sur moi')}
                className={`${ctl} rounded-2xl border border-line shadow-md`}
              >
                <Ico d={I.locate} />
              </button>
            </div>
          )}

          {(stage === 'locating' || stage === 'loading') && (
            <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
              {stage === 'locating' ? t('On te localise…') : t('On cherche les disquaires…')}
            </div>
          )}
          {(stage === 'denied' || stage === 'error') && (
            <div className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-3 bg-raised/90 px-8 text-center">
              {stage === 'denied' ? (
                <>
                  <PinIcon width={30} height={30} className="text-muted" />
                  <p className="font-bold">{t('Où veux-tu chercher ?')}</p>
                  <p className="text-sm text-muted">{t('Tape une adresse ou une ville au-dessus, ou autorise la localisation pour Wishdisc dans ton navigateur.')}</p>
                  <button onClick={locate} className={btn.secondary}>
                    {t('Utiliser ma position')}
                  </button>
                </>
              ) : (
                <>
                  <PinIcon width={30} height={30} className="text-muted" />
                  <p className="font-bold">{t('La recherche n’a pas marché')}</p>
                  <p className="text-sm text-muted">{t('Le service de cartes ne répond pas. Réessaie dans un moment.')}</p>
                  <button onClick={() => setRetry((n) => n + 1)} className={btn.secondary}>
                    {t('Réessayer')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* La fiche et les plus proches */}
        <div className="mt-4 min-w-0 lg:mt-0">
          {stage === 'ready' && !shop && (
            <div className="rounded-3xl border border-line bg-surface px-5 py-8 text-center shadow-xl">
              <p className="font-bold">{t('Aucun disquaire à moins de 30 km')}</p>
              <p className="mt-1 text-sm text-muted">{t('Essaie une ville plus grande dans la recherche, ou les boutiques en ligne depuis la fiche d’un disque.')}</p>
            </div>
          )}
          {shop && <ShopCard key={shop.id} n={index + 1} shop={shop} />}

          {nearest.length > 1 && (
            <>
              <p className="mb-2 mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('Les {n} plus proches', { n: nearest.length })}
              </p>
              <ul className="space-y-2">
                {nearest.map((s, i) => (
                  <ShopRow key={s.id} n={i + 1} s={s} on={s.id === selected} onClick={() => choose(s)} />
                ))}
              </ul>
              {shops.length > NEAREST && <p className="mt-2 px-1 text-xs text-muted">{t('Les autres sont sur la carte.')}</p>}
            </>
          )}

          {stage === 'ready' && (
            <p className="mt-5 px-1 pb-2 text-[11px] text-muted">
              {t('Magasins et horaires issus d’OpenStreetMap, parfois incomplets.')}{' '}
              <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-paper">
                {t('Un disquaire manque ? Ajoute-le sur OpenStreetMap')}
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function ShopRow({ n, s, on, onClick }) {
  const st = openState(s.hours)
  return (
    <li>
      <button
        onClick={onClick}
        aria-current={on ? 'true' : undefined}
        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
          on ? 'border-accent bg-raised' : 'border-line bg-surface hover:border-accent'
        }`}
      >
        <span
          className={`keep-day flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-black ${
            on ? 'bg-[#f1c04e] text-[#1b2420]' : 'bg-[#1d4a3a] text-[#f5f1e8]'
          }`}
        >
          {n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {s.name}
            {s.cafe && <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wider text-muted">· {t('café')}</span>}
            {s.chain && <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wider text-muted">· {t('enseigne')}</span>}
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st == null ? 'bg-muted/40' : st.open ? 'bg-[#2f9a57]' : 'bg-coral'}`} />
            {st ? hoursLabel(st) : t('Horaires inconnus')}
          </span>
        </span>
        <span className="shrink-0 text-right leading-tight">
          <span className="block text-sm font-bold">{formatDistance(s.dist)}</span>
          {s.dist < 3000 && <span className="block text-[11px] text-muted">{t('{n} min à pied', { n: walk(s.dist) })}</span>}
        </span>
      </button>
    </li>
  )
}

// La recherche d'un endroit : une rue, une ville… (propositions au fil de la frappe)
function PlaceSearch({ near, place, located, onPick, onMe }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const text = q.trim()
    if (text.length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setBusy(true)
      geocode(text, { near, signal: ctrl.signal })
        .then((r) => {
          setResults(r)
          setOpen(true)
        })
        .catch(() => {})
        .finally(() => setBusy(false))
    }, 450)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const close = (e) => !box.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function pick(r) {
    onPick({ lat: r.lat, lon: r.lon, title: r.title })
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="flex gap-2">
      <div ref={box} className="relative min-w-0 flex-1">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (results[0]) pick(results[0])
          }}
        >
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon width={18} height={18} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={place ? place.title : t('Une adresse, une ville…')}
            aria-label={t('Chercher un endroit')}
            className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-10 text-base shadow-sm outline-none transition focus:border-accent"
          />
          {busy && <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-accent" />}
        </form>
        {open && q.trim().length >= 3 && (
          <ul role="listbox" className="animate-pop absolute inset-x-0 top-14 z-[700] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
            {results.length === 0 && !busy && <li className="px-4 py-3 text-sm text-muted">{t('Aucun endroit trouvé.')}</li>}
            {results.map((r, i) => (
              <li key={i}>
                <button onClick={() => pick(r)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-raised">
                  <PinIcon width={16} height={16} className="mt-0.5 shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{r.title}</span>
                    {r.sub && <span className="block truncate text-xs text-muted">{r.sub}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={onMe}
        aria-pressed={located && !place}
        aria-label={t('Autour de moi')}
        className={`flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-sm font-bold transition ${
          located && !place ? 'border-accent bg-accent text-ink' : 'border-line bg-surface hover:border-accent'
        }`}
      >
        <Ico d={I.locate} /> <span className="hidden sm:inline">{t('Autour de moi')}</span>
      </button>
    </div>
  )
}

function ShopCard({ n, shop }) {
  const st = openState(shop.hours)
  const website = shop.website && (/^https?:\/\//.test(shop.website) ? shop.website : `https://${shop.website}`)
  const action = 'flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition'
  return (
    <article className="animate-pop rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="keep-day flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1c04e] font-display text-lg font-black text-[#1b2420] shadow">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-black uppercase leading-[0.95]">{shop.name}</h3>
          {shop.address && <p className="mt-1 truncate text-sm text-muted">{shop.address}</p>}
          {shop.chain && (
            <span className="mt-2 inline-block rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              {t('Enseigne · rayon vinyles')}
            </span>
          )}
          {shop.cafe && (
            <span className="keep-day mt-2 inline-block rounded-full bg-[#f1c04e]/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#b8860b]">
              {t('Café-disquaire')}
            </span>
          )}
        </div>
      </div>

      {/* Distance et horaires */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-xs font-bold">
          <Ico d={I.walk} size={14} /> {formatDistance(shop.dist)}
          {shop.dist < 3000 && ` · ${t('{n} min', { n: walk(shop.dist) })}`}
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            st == null ? 'bg-raised text-muted' : st.open ? 'keep-day bg-[#2f9a57]/15 text-[#2f9a57]' : 'keep-day bg-coral/15 text-coral'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${st == null ? 'bg-muted/50' : st.open ? 'bg-[#2f9a57]' : 'bg-coral'}`} />
          {st ? hoursLabel(st) : t('Horaires inconnus')}
        </span>
      </div>
      {!st && shop.hours && <p className="mt-2 font-mono text-[11px] text-muted">{shop.hours}</p>}

      <div className="mt-5 flex gap-2">
        <a href={directionsUrl(shop)} target="_blank" rel="noopener noreferrer" className={`${action} bg-accent text-ink hover:bg-accent-soft`}>
          <Ico d={I.route} /> {t('Itinéraire')}
        </a>
        {shop.phone && (
          <a href={`tel:${shop.phone.replace(/[^\d+]/g, '')}`} aria-label={t('Appeler')} className={`${action} max-w-28 border border-line hover:border-accent`}>
            <Ico d={I.phone} /> <span className="hidden sm:inline">{t('Appeler')}</span>
          </a>
        )}
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer" aria-label={t('Site')} className={`${action} max-w-28 border border-line hover:border-accent`}>
            <Ico d={I.web} /> <span className="hidden sm:inline">{t('Site')}</span>
          </a>
        )}
      </div>
    </article>
  )
}