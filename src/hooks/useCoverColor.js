import { useEffect, useState } from 'react'

// La couleur dominante d'une pochette, pour teinter la fiche du disque.
// On réduit l'image à 24 × 24 et on garde la couleur la plus « vivante »
// (les pixels très gris, très sombres ou très clairs comptent moins).
// Si l'image refuse d'être lue (protection du site d'origine), on renvoie null.
const cache = new Map()

function pick(data) {
  // On range les pixels par « famille » de couleur, et on garde la famille qui pèse
  // le plus (beaucoup de pixels, et des couleurs vives plutôt que grises).
  const buckets = new Map()
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3]
    if (A < 128) continue
    const max = Math.max(R, G, B), min = Math.min(R, G, B)
    const light = (max + min) / 510
    const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
    const weight = 0.15 + sat * (1 - Math.abs(light - 0.5) * 1.4)
    const key = (R >> 5) * 64 + (G >> 5) * 8 + (B >> 5)
    const k = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, w: 0 }
    k.r += R; k.g += G; k.b += B; k.n += 1; k.w += weight
    buckets.set(key, k)
  }
  let best = null
  for (const k of buckets.values()) if (!best || k.w > best.w) best = k
  return best ? [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)] : null
}

// Les pochettes Discogs refusent d'être lues par une page web (pas d'en-tête CORS) :
// on passe alors par wsrv.nl, un relais d'images gratuit qui les renvoie en 24 × 24, lisibles.
export const corsImage = (url, size = 24) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=png`

function colorOf(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 24
        const ctx = c.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, 24, 24)
        resolve(pick(ctx.getImageData(0, 0, 24, 24).data))
      } catch {
        resolve(undefined) // image « protégée »
      }
    }
    img.onerror = () => resolve(undefined)
    img.src = src
  })
}

export function readCoverColor(url) {
  if (!url) return Promise.resolve(null)
  if (cache.has(url)) return cache.get(url)
  const direct = /^(blob:|data:)/.test(url) || url.startsWith(location.origin)
  const p = (direct ? colorOf(url) : colorOf(corsImage(url))).then(async (rgb) => {
    if (rgb !== undefined) return rgb
    // le relais ne répond pas : on tente l'image d'origine
    const again = direct ? undefined : await colorOf(url)
    return again ?? null
  })
  cache.set(url, p)
  return p
}

export default function useCoverColor(url) {
  const [state, setState] = useState({ url: null, rgb: null })
  useEffect(() => {
    let alive = true
    readCoverColor(url).then((rgb) => alive && setState({ url, rgb }))
    return () => {
      alive = false
    }
  }, [url])
  return state.url === url ? state.rgb : null
}