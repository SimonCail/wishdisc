import { useEffect, useState } from 'react'
import Cover from './Cover'
import { CloseIcon, ShareIcon } from './Icons'
import { t, tn } from '../lib/i18n'
import { periodLabel, wrappedTexts } from '../lib/wrapped'
import { corsImage } from '../hooks/useCoverColor'

const BG = 'linear-gradient(160deg,#1d4a3a 0%,#123326 55%,#0c1f18 100%)'
const SUN = '#f1c04e'

// --- L'image à partager (format story 1080 × 1920) ---
function loadOne(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}
// Par le relais wsrv.nl (sinon la pochette Discogs empêcherait d'enregistrer l'image)
async function loadImage(url) {
  if (!url) return null
  return (await loadOne(corsImage(url, 600))) || null
}

async function drawStory(w, name, withCover = true) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1920
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 1080, 1920)
  grad.addColorStop(0, '#1d4a3a')
  grad.addColorStop(0.55, '#123326')
  grad.addColorStop(1, '#0c1f18')
  g.fillStyle = grad
  g.fillRect(0, 0, 1080, 1920)
  const font = (size, weight = 900) => `${weight} ${size}px Archivo, system-ui, sans-serif`

  g.fillStyle = SUN
  g.font = font(34, 700)
  g.fillText('WISHDISC WRAPPED', 90, 150)
  g.fillStyle = '#f5f1e8'
  g.font = font(120)
  g.fillText(t('Mon {period}', { period: periodLabel(w.period) }).toUpperCase(), 90, 290)
  g.fillText(t('en vinyles.').toUpperCase(), 90, 410)

  // La pochette de l'année
  let y = 490
  const img = withCover && w.record?.cover_url ? await loadImage(w.record.cover_url) : null
  if (img) {
    g.drawImage(img, 90, y, 500, 500)
    g.fillStyle = '#c8d2ca'
    g.font = font(32, 500)
    g.fillText(wrappedTexts(w.period).myRecord, 630, y + 50)
    g.fillStyle = '#f5f1e8'
    g.font = font(52, 800)
    wrap(g, w.record.title, 630, y + 130, 380, 62)
    g.fillStyle = '#c8d2ca'
    g.font = font(36, 500)
    g.fillText(w.record.artist.slice(0, 20), 630, y + 300)
  }
  y = img ? 1050 : 560

  const tile = (x, ty, big, small) => {
    g.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(g, x, ty, 435, 240, 36)
    g.fillStyle = SUN
    g.font = font(120)
    g.fillText(String(big), x + 40, ty + 135)
    g.fillStyle = '#f5f1e8'
    g.font = font(38, 600)
    g.fillText(small, x + 40, ty + 200)
  }
  tile(90, y, w.added, tn(w.added, 'disque ajouté', 'disques ajoutés'))
  tile(555, y, w.granted, tn(w.granted, 'souhait exaucé', 'souhaits exaucés'))
  y += 280
  // Top 5 genres et top 5 artistes, côte à côte
  const column = (x, title, rows) => {
    g.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(g, x, y, 435, 470, 36)
    g.fillStyle = '#c8d2ca'
    g.font = font(32, 500)
    g.fillText(title, x + 40, y + 62)
    rows.slice(0, 5).forEach((r, k) => {
      const ry = y + 140 + k * 72
      g.fillStyle = '#8fa398'
      g.font = font(30, 600)
      g.fillText(String(k + 1), x + 40, ry)
      g.fillStyle = k === 0 ? SUN : '#f5f1e8'
      g.font = font(k === 0 ? 44 : 38, k === 0 ? 900 : 700)
      let text = String(r)
      while (g.measureText(text).width > 320 && text.length > 3) text = text.slice(0, -2)
      g.fillText(text === String(r) ? text : `${text.trimEnd()}…`, x + 85, ry)
    })
  }
  if (w.genres.length || w.artists.length) {
    column(90, t('Top genres'), w.genres.map((x) => x.name))
    column(555, t('Top artistes'), w.artists.map((x) => x.name))
  }
  g.fillStyle = '#8fa398'
  g.font = font(32, 600)
  g.fillText(`${name} · wishdisc`, 90, 1840)
  return c
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
  g.fill()
}
function wrap(g, text, x, y, max, lh) {
  const words = String(text).split(' ')
  let line = ''
  let n = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y + n * lh)
      line = w
      if (++n > 1) return
    } else line = test
  }
  g.fillText(line, x, y + n * lh)
}

async function toBlob(w, name) {
  try {
    const canvas = await drawStory(w, name, true)
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'))
  } catch {
    // La pochette empêche l'export (protection du site d'origine) : on refait sans
    const canvas = await drawStory(w, name, false)
    return await new Promise((res) => canvas.toBlob(res, 'image/png'))
  }
}

// --- Les écrans, façon story ---
export default function WrappedView({ data, name, onClose, onToast }) {
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const tx = wrappedTexts(data.period)
  const label = periodLabel(data.period)
  const slides = ['intro', 'numbers', data.genre && 'genre', data.artist && 'artist', data.record && 'record', 'recap'].filter(Boolean)
  const slide = slides[Math.min(i, slides.length - 1)]
  const next = () => setI((n) => Math.min(n + 1, slides.length - 1))
  const prev = () => setI((n) => Math.max(n - 1, 0))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function share() {
    setBusy(true)
    const blob = await toBlob(data, name)
    setBusy(false)
    if (!blob) return onToast(t('Impossible de créer l’image.'), 'error')
    const file = new File([blob], `wishdisc-${data.id}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Wishdisc Wrapped' })
      } catch {
        // partage annulé
      }
      return
    }
    // Ordinateur : on télécharge l'image
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    onToast(t('Image enregistrée'))
  }

  const tile = 'rounded-3xl bg-white/[0.08] p-4'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wishdisc Wrapped"
      className="keep-day fixed inset-0 z-50 flex items-center justify-center bg-black/80 sm:p-4"
    >
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden text-[#f5f1e8] sm:h-[min(92vh,52rem)] sm:rounded-[2rem]"
        style={{ background: BG, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Barres de progression */}
        <div className="flex gap-1.5 px-4 pt-4">
          {slides.map((s, k) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${k <= i ? 'bg-[#f1c04e]' : 'bg-white/20'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between px-5 pt-3">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#f1c04e]">WISHDISC WRAPPED</p>
          <button onClick={onClose} aria-label={t('Fermer')} className="rounded-full p-2 hover:bg-white/10">
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        {/* Zones de tap : gauche = précédent, droite = suivant */}
        <button aria-label={t('Précédent')} onClick={prev} className="absolute bottom-28 left-0 top-24 z-10 w-1/3" />
        <button aria-label={t('Suivant')} onClick={next} className="absolute bottom-28 right-0 top-24 z-10 w-2/3" />

        <div key={slide} className="page-in flex min-h-0 flex-1 flex-col justify-center px-6 pb-6">
          {slide === 'intro' && (
            <>
              <p className="font-display text-6xl font-black uppercase leading-[0.85]">
                {t('Ton {period}', { period: label })}
                <br />
                {t('en vinyles.')}
              </p>
              <p className="mt-6 text-lg text-[#c8d2ca]">{t('Ce que tu as voulu, ce que tu as eu, ce que tu as écouté. Touche pour avancer.')}</p>
            </>
          )}
          {slide === 'numbers' && (
            <div className="space-y-3">
              <div className={tile}>
                <p className="font-display text-7xl font-black leading-none text-[#f1c04e]">{data.added}</p>
                <p className="mt-1 text-lg">{tn(data.added, 'disque ajouté à ta liste', 'disques ajoutés à ta liste')}</p>
              </div>
              <div className={tile}>
                <p className="font-display text-7xl font-black leading-none text-[#f1c04e]">{data.granted}</p>
                <p className="mt-1 text-lg">{tn(data.granted, 'souhait exaucé', 'souhaits exaucés')}</p>
              </div>
              <p className="pt-2 text-[#c8d2ca]">
                {tn(data.wishes, 'Et encore {n} souhait qui t’attend.', 'Et encore {n} souhaits qui t’attendent.')}
              </p>
            </div>
          )}
          {slide === 'genre' && (
            <>
              <p className="text-lg text-[#c8d2ca]">{t('Ton genre')}</p>
              <p className="mt-1 break-words font-display text-6xl font-black uppercase leading-[0.9]">{data.genre.name}</p>
              <p className="mt-4 font-display text-5xl font-black text-[#f1c04e]">{data.genre.pct} %</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#f1c04e]" style={{ width: `${data.genre.pct}%` }} />
              </div>
              {data.genres.length > 1 && (
                <ol className="mt-6 space-y-2.5">
                  {data.genres.slice(1).map((g, k) => (
                    <li key={g.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-bold">
                          <span className="mr-2 font-mono text-sm text-[#c8d2ca]">{k + 2}</span>
                          {g.name}
                        </span>
                        <span className="shrink-0 text-sm text-[#c8d2ca]">{g.pct} %</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#f1c04e]/60" style={{ width: `${g.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {data.decade && (
                <p className="mt-6 text-lg">{t('Et ta décennie préférée : les années {decade}.', { decade: data.decade })}</p>
              )}
            </>
          )}
          {slide === 'artist' && (
            <>
              <p className="text-lg text-[#c8d2ca]">{tx.artist}</p>
              {data.artist.cover && <Cover url={data.artist.cover} className={`mt-4 aspect-square rounded-lg shadow-2xl ${data.artists.length > 1 ? 'w-32' : 'w-48'}`} />}
              <p className="mt-5 font-display text-5xl font-black uppercase leading-[0.9]">{data.artist.name}</p>
              <p className="mt-2 text-lg text-[#c8d2ca]">{tn(data.artist.n, '{n} disque dans ta liste', '{n} disques dans ta liste')}</p>
              {data.artists.length > 1 && (
                <ol className="mt-5 space-y-2">
                  {data.artists.slice(1).map((a, k) => (
                    <li key={a.name} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 font-mono text-sm text-[#c8d2ca]">{k + 2}</span>
                      <Cover url={a.cover} className="h-10 w-10 shrink-0 rounded-md" />
                      <span className="min-w-0 flex-1 truncate font-bold">{a.name}</span>
                      <span className="shrink-0 text-sm text-[#c8d2ca]">{a.n}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          {slide === 'record' && (
            <>
              <p className="text-lg text-[#c8d2ca]">{tx.record}</p>
              <Cover url={data.record.cover_url} className="mt-4 aspect-square w-full max-w-72 rounded-lg shadow-2xl" />
              <p className="mt-5 font-display text-4xl font-black uppercase leading-[0.9]">{data.record.title}</p>
              <p className="mt-2 text-lg text-[#c8d2ca]">{data.record.artist}</p>
            </>
          )}
          {slide === 'recap' && <Recap data={data} label={label} tx={tx} />}
        </div>

        <div className="relative z-20 flex gap-2 px-5 pb-6">
          <button
            onClick={share}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#f1c04e] py-3.5 font-bold text-[#1b2420] transition hover:brightness-105 disabled:opacity-60"
          >
            <ShareIcon width={18} height={18} /> {busy ? t('Préparation…') : t('Partager en story')}
          </button>
          {i < slides.length - 1 && (
            <button onClick={next} className="rounded-full bg-white/10 px-5 font-bold transition hover:bg-white/20">
              {t('Suivant ›')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Le récap final : tout sur un écran, comme l'image à partager
function Recap({ data, label, tx }) {
  const box = 'rounded-2xl bg-white/[0.08] px-4 py-3'
  return (
    <div className="space-y-2.5">
      <p className="font-display text-4xl font-black uppercase leading-[0.85]">
        {t('Mon {period}', { period: label })}
        <br />
        {t('en vinyles.')}
      </p>
      {data.record && (
        <div className="flex items-center gap-3 pt-1">
          <Cover url={data.record.cover_url} className="aspect-square w-24 shrink-0 rounded-lg shadow-xl" />
          <div className="min-w-0">
            <p className="text-xs text-[#c8d2ca]">{tx.myRecord}</p>
            <p className="line-clamp-2 font-display text-xl font-black leading-tight">{data.record.title}</p>
            <p className="truncate text-sm text-[#c8d2ca]">{data.record.artist}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <div className={box}>
          <p className="font-display text-4xl font-black leading-none text-[#f1c04e]">{data.added}</p>
          <p className="mt-1 text-sm">{tn(data.added, 'disque ajouté', 'disques ajoutés')}</p>
        </div>
        <div className={box}>
          <p className="font-display text-4xl font-black leading-none text-[#f1c04e]">{data.granted}</p>
          <p className="mt-1 text-sm">{tn(data.granted, 'souhait exaucé', 'souhaits exaucés')}</p>
        </div>
      </div>
      {(data.genres.length > 0 || data.artists.length > 0) && (
        <div className="grid grid-cols-2 gap-2.5">
          <TopList title={t('Top genres')} rows={data.genres.map((g) => g.name)} box={box} />
          <TopList title={t('Top artistes')} rows={data.artists.map((a) => a.name)} box={box} />
        </div>
      )}
      {data.decade && <p className="text-sm text-[#c8d2ca]">{t('Ma décennie : les années {decade}', { decade: data.decade })}</p>}
      <p className="pt-1 font-display text-lg font-black uppercase leading-tight text-[#f1c04e]">
        {tx.bye} {t('dans les bacs.')}
      </p>
    </div>
  )
}

function TopList({ title, rows, box }) {
  return (
    <div className={`${box} min-w-0`}>
      <p className="mb-1.5 text-xs text-[#c8d2ca]">{title}</p>
      <ol className="space-y-0.5">
        {rows.map((r, k) => (
          <li key={r} className={`truncate text-sm ${k === 0 ? 'font-display text-base font-black text-[#f1c04e]' : 'font-bold'}`}>
            <span className="mr-1.5 font-mono text-[11px] font-normal text-[#c8d2ca]">{k + 1}</span>
            {r}
          </li>
        ))}
      </ol>
    </div>
  )
}