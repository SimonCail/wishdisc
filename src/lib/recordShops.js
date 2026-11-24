// « Disquaires autour de moi » : les magasins de disques d'OpenStreetMap (shop=music),
// trouvés avec l'API Overpass. Données ouvertes (ODbL), utilisables dans une app publique.

import { locale } from './i18n'
import { supabase } from './supabase'

// Le serveur principal est souvent saturé (erreurs 502, 504, 429) : on essaie ensuite des copies
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const CACHE = 'wishdisc-shops-v19'
const TTL = 24 * 3600 * 1000

// Distance en mètres entre deux points (formule de haversine)
export function distance(a, b) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const formatDistance = (m) =>
  m < 950
    ? `${Math.max(50, Math.round(m / 50) * 50)} m`
    : `${(m / 1000).toLocaleString(locale(), { maximumFractionDigits: m < 9500 ? 1 : 0 })} km`

function address(tags) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  return [street, tags['addr:city']].filter(Boolean).join(', ')
}

// Bars, chichas, boîtes de nuit… parfois marqués « musique » dans OpenStreetMap : on les écarte
const NOT_SHOP_AMENITY = /^(bar|pub|nightclub|hookah_lounge|cafe|restaurant|fast_food|biergarten|events_venue|music_venue|theatre|cinema|arts_centre|studio)$/
// Les « cafés-disquaires » : un café ou un bar gardé seulement s'il VEND des disques, c'est-à-dire
// marqué aussi magasin de musique dans OpenStreetMap (un nom comme « Vinyl Café » ne suffit pas :
// beaucoup passent des vinyles sans en vendre)
const CAFE = /^(cafe|bar|pub|restaurant|biergarten)$/
// Les grandes enseignes qui ont un rayon vinyles
export const CHAINS = /\b(fnac|cultura|furet du nord|gibert|espace culturel)\b/i
export const isChain = (tags) => CHAINS.test(`${tags.brand || ''} ${tags.name || ''}`)
export const sellsRecords = (tags) =>
  /^(music|records|vinyl|vinyls)$/.test(tags.shop || '') || /vinyl|record/i.test(`${tags.music || ''} ${tags.second_hand || ''}`)
const NOT_SHOP_SHOP = /^(hookah|tobacco|e-cigarette|musical_instrument|electronics|hifi|mobile_phone)$/
function notARecordShop(tags) {
  if (tags.amenity && NOT_SHOP_AMENITY.test(tags.amenity) && !(CAFE.test(tags.amenity) && sellsRecords(tags))) return true
  if (tags.shop && NOT_SHOP_SHOP.test(tags.shop)) return true
  if (tags.leisure || tags.club) return true
  // Fermé pour de bon
  if (tags.disused || tags['disused:shop'] || tags['was:shop'] || tags.shop === 'vacant') return true
  return /chicha|shisha|hookah|lounge|karaok/i.test(`${tags.name} ${tags.description || ''}`)
}

// « Magasin de musique » sans rien d'autre (pas d'horaires, d'adresse, de site ni de téléphone) :
// souvent une erreur ou un lieu fermé depuis longtemps. On le garde seulement si son nom parle de disques.
const RECORD_NAME = /vinyl|vinyle|disque|disquaire|record|platten|discos?\b/i
// derivedAddr : l'adresse vient du moteur de recherche (rue la plus proche), pas de la fiche du magasin
function unverified(tags, derivedAddr = false) {
  if (/^(records|vinyl|vinyls)$/.test(tags.shop || '')) return false
  if (RECORD_NAME.test(tags.name) || /vinyl|record/i.test(`${tags.music || ''} ${tags.second_hand || ''}`)) return false
  const info = tags.opening_hours || tags.website || tags['contact:website'] || tags.phone || tags['contact:phone'] || (!derivedAddr && tags['addr:street']) || tags['contact:street'] || tags['contact:facebook'] || tags['contact:instagram']
  return !info
}

// Réponse Overpass → [{ id, name, lat, lon, hours, phone, website, address }]
export function parseShops(json) {
  const out = []
  const seen = new Set()
  for (const el of json?.elements || []) {
    if (seen.has(`${el.type}/${el.id}`)) continue
    seen.add(`${el.type}/${el.id}`)
    const tags = el.tags || {}
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (!tags.name || lat == null || lon == null) continue
    const chain = isChain(tags) && !!tags.shop // (un parking « Fnac » n'est pas un magasin)
    if (!chain && notARecordShop(tags)) continue
    // Ni magasin ni café-disquaire (un lieu sans « shop ») : on ne le garde pas
    if (!chain && !tags.shop && !sellsRecords(tags)) continue
    // Autre type de boutique (occasion…) : seulement si elle parle de disques
    if (!chain && tags.shop && !/^(music|records|vinyl|vinyls)$/.test(tags.shop) && !RECORD_NAME.test(tags.name) && !/vinyl|record|music|disque/i.test(`${tags.music || ''} ${tags.second_hand || ''}`)) continue
    if (!chain && !el.noExtra && unverified(tags, el.derivedAddr)) continue
    out.push({
      id: `${el.type}/${el.id}`,
      name: tags.name,
      lat,
      lon,
      hours: tags.opening_hours || null,
      phone: tags.phone || tags['contact:phone'] || null,
      website: tags.website || tags['contact:website'] || null,
      address: address(tags),
      cafe: !!(tags.amenity && CAFE.test(tags.amenity)),
      chain,
    })
  }
  return mergeDuplicates(out)
}

// Le même magasin est parfois dessiné deux fois dans OpenStreetMap (un point ET un bâtiment,
// ou deux points) : même nom à moins de 400 m → un seul, avec les infos des deux.
const sameName = (a, b) => a.name.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '') === b.name.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '')
const richness = (s) => (s.hours ? 2 : 0) + (s.phone ? 1 : 0) + (s.website ? 1 : 0) + (s.address ? 1 : 0)
export function mergeDuplicates(list) {
  const out = []
  for (const s of list) {
    const twin = out.find((o) => sameName(o, s) && distance(o, s) < 400)
    if (!twin) {
      out.push({ ...s, ids: [s.id] })
      continue
    }
    const [best, other] = richness(s) > richness(twin) ? [s, twin] : [twin, s]
    Object.assign(twin, {
      id: best.id,
      lat: best.lat,
      lon: best.lon,
      hours: best.hours || other.hours,
      phone: best.phone || other.phone,
      website: best.website || other.website,
      address: best.address || other.address,
      ids: [...twin.ids, s.id],
    })
  }
  return out
}

// Dans OpenStreetMap, un disquaire n'est pas toujours rangé pareil : « shop=music » le plus souvent,
// mais aussi des boutiques d'occasion, des tags « records » / « vinyl », ou seulement un nom
// qui parle de disques. On ratisse large, sur les points, les bâtiments et les relations.
// Une « boîte » autour de moi (bien plus rapide pour le serveur qu'un cercle « around »),
// puis on garde le cercle côté app avec la distance.
function box(p, radius) {
  const dLat = radius / 111320
  const dLon = radius / (111320 * Math.cos((p.lat * Math.PI) / 180))
  return [p.lat - dLat, p.lon - dLon, p.lat + dLat, p.lon + dLon].map((x) => x.toFixed(5)).join(',')
}

// Tags exacts seulement (rapides pour le serveur), comme la fonction « shops »
const CHAIN_BRANDS = ['Fnac', 'Cultura', 'Furet du Nord', 'Gibert Joseph', 'Gibert Jeune', 'E.Leclerc Espace Culturel', 'Espace Culturel E.Leclerc', 'Espace Culturel']
const query = (p, radius, wide) => {
  const chains = wide ? '' : CHAIN_BRANDS.map((b) => `nw["brand"="${b}"];nw["name"="${b}"];`).join('\n') + '\nnw["second_hand"="vinyl"];nw["music"="vinyl"];'
  return `[out:json][timeout:25][bbox:${box(p, radius)}];(
nw["shop"="music"];
nw["shop"="records"];
nw["shop"="vinyl"];
${chains}
);out center tags;`
}

async function ask(url, body, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  })
  if (!res.ok) throw new Error(`Overpass ${res.status}`)
  return await res.json()
}

// On commence par le dernier serveur qui a marché
const GOOD = 'wishdisc-overpass-ok'
function serversInOrder() {
  let good = null
  try {
    good = localStorage.getItem(GOOD)
  } catch {
    // rien
  }
  return good && SERVERS.includes(good) ? [good, ...SERVERS.filter((u) => u !== good)] : SERVERS
}

const HEDGE = 6000 // sans réponse au bout de 6 s, on lance aussi le serveur suivant
const GIVE_UP = 30000

// Le premier serveur qui répond gagne ; les autres demandes sont annulées
async function overpass(p, radius, wide = false) {
  const body = `data=${encodeURIComponent(query(p, radius, wide))}`
  const ctrl = new AbortController()
  const giveUp = setTimeout(() => ctrl.abort(), GIVE_UP)
  const servers = serversInOrder()
  try {
    return await new Promise((resolve, reject) => {
      let failed = 0
      let started = 0
      const timers = []
      const start = () => {
        if (started >= servers.length || ctrl.signal.aborted) return
        const url = servers[started++]
        ask(url, body, ctrl.signal).then(
          (json) => {
            timers.forEach(clearTimeout)
            try {
              localStorage.setItem(GOOD, url)
            } catch {
              // rien
            }
            resolve(parseShops(json).filter((s) => distance(p, s) <= radius))
          },
          (e) => {
            if (++failed === servers.length || ctrl.signal.aborted) reject(e)
            else start() // erreur franche : on passe tout de suite au suivant
          },
        )
        timers.push(setTimeout(start, HEDGE))
      }
      start()
    })
  } finally {
    clearTimeout(giveUp)
    ctrl.abort() // coupe les demandes encore en cours
  }
}

// D'abord par la fonction Supabase « shops » (script 26) : elle interroge OpenStreetMap depuis
// le serveur et garde le résultat une semaine par zone, pour tout le monde.
// Si la fonction n'est pas (encore) déployée, on interroge OpenStreetMap directement.
// On montre les disquaires à moins de 30 km, et c'est tout
export const MAX_DIST = 30000

// D'abord par la fonction Supabase « shops » : elle garde OpenStreetMap par grands carreaux,
// donc la réponse est immédiate dès que quelqu'un a déjà cherché dans la région.

async function viaSupabase(p) {
  const { data, error } = await supabase.functions.invoke('shops', { body: { lat: p.lat, lon: p.lon, range: 'auto' } })
  if (error || !data || data.error) throw error || new Error(data?.error || 'shops')
  const radius = MAX_DIST
  return parseShops(data).filter((s) => distance(p, s) <= radius)
}
// 1. Photon (komoot) : un moteur de recherche sur les données OpenStreetMap, très rapide
//    (≈ 0,2 s). Sa recherche « autour d'un point » filtrée sur les magasins de disques
//    donne les plus proches, triés par distance. 10 km s'il y en a au moins 3, sinon 40, sinon 120.
const PHOTON_TAGS = ['shop:music', 'shop:records', 'shop:vinyl']
async function photonFeatures(p, km, tags) {
  const params = new URLSearchParams({ lat: p.lat.toFixed(5), lon: p.lon.toFixed(5), radius: String(km), limit: '50' })
  for (const tag of tags) params.append('osm_tag', tag)
  const res = await fetch(`https://photon.komoot.io/reverse?${params}`, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  return (await res.json()).features || []
}
async function photonAround(p, km) {
  // Une seule demande à Photon (il limite les applis trop bavardes) ; les cafés-disquaires, boutiques
  // d'occasion et enseignes arrivent juste après avec la recherche complète (complément en arrière-plan)
  const main = await photonFeatures(p, km, PHOTON_TAGS)
  const seen = new Set()
  const features = main.filter((f) => {
    const k = `${f.properties?.osm_type}/${f.properties?.osm_id}`
    return !seen.has(k) && seen.add(k)
  })
  const found = features.map((f) => {
    const pr = f.properties || {}
    const [lon, lat] = f.geometry?.coordinates || []
    return { type: { N: 'node', W: 'way', R: 'relation' }[pr.osm_type] || 'node', id: pr.osm_id, lat, lon, pr }
  })
  // Photon ne donne ni horaires ni site : on les demande à OpenStreetMap, par identifiant (rapide)
  const full = await osmTags(found)
  const elements = found.map(({ type, id, lat, lon, pr }) => {
    const tags = full.get(`${type}/${id}`)
    if (tags) {
      // Vraie fiche OpenStreetMap ; l'adresse de Photon seulement pour l'affichage si la fiche n'en a pas
      const derived = !tags['addr:street']
      return {
        type,
        id,
        lat,
        lon,
        tags: derived ? { ...tags, 'addr:street': pr.street, 'addr:housenumber': pr.housenumber, 'addr:city': tags['addr:city'] || pr.city } : tags,
        derivedAddr: derived,
      }
    }
    // OpenStreetMap n'a pas répondu à temps : on garde ce que Photon sait (sans pouvoir trier les fiches vides)
    return {
      type,
      id,
      lat,
      lon,
      tags: { name: pr.name, shop: pr.osm_value, 'addr:housenumber': pr.housenumber, 'addr:street': pr.street, 'addr:city': pr.city },
      noExtra: true,
    }
  })
  return parseShops({ elements })
}

// Les tags complets (horaires, téléphone, site…) depuis l'API officielle d'OpenStreetMap.
// Une ou deux petites demandes par identifiants, en général moins d'une demi-seconde.
async function osmTags(list) {
  const out = new Map()
  const byType = { node: [], way: [], relation: [] }
  for (const e of list) if (byType[e.type] && e.id) byType[e.type].push(e.id)
  await Promise.all(
    Object.entries(byType)
      .filter(([, ids]) => ids.length)
      .map(async ([type, ids]) => {
        try {
          const res = await fetch(`https://api.openstreetmap.org/api/0.6/${type}s.json?${type}s=${ids.join(',')}`, { signal: AbortSignal.timeout(3000) })
          if (!res.ok) return
          const json = await res.json()
          for (const el of json.elements || []) out.set(`${el.type}/${el.id}`, el.tags || {})
        } catch {
          // trop lent ou en panne : tant pis pour les détails
        }
      }),
  )
  return out
}

async function viaPhoton(p) {
  let list = []
  for (const km of [MAX_DIST / 1000]) {
    list = await photonAround(p, km)
    if (list.length >= 3) break
  }
  // Rien du tout dans les 30 km : on vérifie quand même par l'autre chemin (plus lent mais complet)
  if (!list.length) throw new Error('Photon : rien')
  return list
}

let functionMissing = false

// Résultat gardé un jour par zone (~1 km).
// Si tous les serveurs sont en panne, on ressort la dernière recherche faite près d'ici.
function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || 'null')
  } catch {
    return null
  }
}
// Photon répond tout de suite mais ne connaît pas tout. En arrière-plan, on complète avec la
// recherche complète d'OpenStreetMap (fonction « shops », gardée par carreaux côté serveur) :
// onMore(liste) est appelé si des disquaires s'ajoutent. La liste complète est gardée sur l'appareil.
function saveZone(zone, list, complete) {
  try {
    const all = readCache()
    const rest = (Array.isArray(all) ? all : []).filter((x) => x.zone !== zone).slice(0, 11)
    localStorage.setItem(CACHE, JSON.stringify([{ zone, at: Date.now(), list, complete }, ...rest]))
  } catch {
    // tant pis
  }
}
async function complete(p) {
  if (!functionMissing) {
    try {
      return await viaSupabase(p)
    } catch (e) {
      // 404 : fonction pas déployée → on n'insiste plus pendant cette visite
      if (e?.context?.status === 404 || /not found|404/i.test(String(e?.message))) functionMissing = true
      else throw e // fonction en panne : on garde la liste rapide de Photon
    }
  }
  // Fonction pas déployée : OpenStreetMap directement, dans les 30 km
  const list = await overpass(p, MAX_DIST, false)
  return list
}
function union(a, b) {
  const ids = new Set(a.flatMap((s) => s.ids || [s.id]))
  return mergeDuplicates([...a, ...b.filter((s) => !(s.ids || [s.id]).some((id) => ids.has(id)))])
}

// 1. La fonction « shops » (Supabase) : la liste complète (magasins, cafés-disquaires, enseignes),
//    gardée par grandes zones côté serveur → immédiate dès que la zone est connue.
// 2. Si elle met plus de 1,2 s (zone jamais cherchée), on affiche en attendant ce que Photon
//    trouve, puis la liste complète remplace l'attente dès qu'elle arrive (onMore).
const WAIT_FOR_FULL = 1200
export async function findShops(p, onMore) {
  const zone = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`
  const all = readCache()
  const c = Array.isArray(all) ? all.find((x) => x.zone === zone) : null
  if (c && c.complete && Date.now() - c.at < TTL) return withDistance(c.list, p)

  const full = complete(p).then((list) => {
    saveZone(zone, list, true)
    return list
  })
  full.catch(() => {})
  const quick = new Promise((resolve) => setTimeout(() => resolve('wait'), WAIT_FOR_FULL))
  const first = await Promise.race([full.then((l) => ({ l })).catch(() => 'failed'), quick])
  if (first && first.l) return withDistance(first.l, p)

  // La liste complète tarde (ou a échoué) : Photon en attendant
  let temp = null
  try {
    temp = await viaPhoton(p)
  } catch {
    // Photon non plus
  }
  if (onMore) {
    full
      .then((list) => {
        const merged = temp ? union(list, temp) : list
        saveZone(zone, merged, true)
        onMore(withDistance(merged, p))
      })
      .catch(() => {})
  }
  if (temp) return withDistance(temp, p)
  // rien de rapide : on attend la liste complète, sinon la dernière recherche gardée près d'ici
  try {
    return withDistance(await full, p)
  } catch (e) {
    const near = (Array.isArray(all) ? all : []).find((x) => x.list?.length && distance(p, { lat: Number(x.zone.split(',')[0]), lon: Number(x.zone.split(',')[1]) }) < 15000)
    if (near) return withDistance(near.list, p)
    throw e
  }
}

const withDistance = (list, p, max = MAX_DIST) =>
  list
    .map((s) => ({ ...s, dist: distance(p, s) }))
    .filter((s) => s.dist <= max)
    .sort((a, b) => a.dist - b.dist)

export function directionsUrl(s) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios
    ? `https://maps.apple.com/?daddr=${s.lat},${s.lon}&q=${encodeURIComponent(s.name)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`
}

// ——— Horaires OSM (« Mo-Sa 10:00-19:00; Su off ») : on comprend les formes courantes ———
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const toMin = (hm) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

// → tableau de 7 jours (lundi = 0), chacun une liste de [début, fin] en minutes ; null si on ne sait pas lire
export function parseHours(text) {
  if (!text) return null
  const s = text.trim()
  if (s === '24/7') return DAYS.map(() => [[0, 1440]])
  const week = DAYS.map(() => null)
  for (const raw of s.split(';')) {
    const rule = raw.trim()
    if (!rule) continue
    const m = rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)?(?:,?\s*PH)?\s*(.*)$/)
    if (!m) return null
    const daysPart = m[1]
    const timePart = m[2].trim()
    if (!daysPart && /^PH\b/.test(rule)) continue // jours fériés : on ignore
    const days = new Set()
    if (!daysPart) DAYS.forEach((_, i) => days.add(i))
    else
      for (const chunk of daysPart.split(',')) {
        const [a, b] = chunk.split('-').map((d) => DAYS.indexOf(d))
        if (b === undefined) days.add(a)
        else for (let i = a; ; i = (i + 1) % 7) {
          days.add(i)
          if (i === b) break
        }
      }
    let ranges
    if (/^(off|closed)$/i.test(timePart)) ranges = []
    else {
      ranges = []
      for (const r of timePart.split(',')) {
        const t = r.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
        if (!t) return null
        let end = toMin(t[2])
        const start = toMin(t[1])
        if (end <= start) end += 1440
        ranges.push([start, end])
      }
    }
    for (const d of days) week[d] = ranges
  }
  return week.map((r) => r || [])
}

const hm = (min) => min % 1440

// État maintenant : { open: true, until: minutes } ou { open: false, next: { inDays, at: minutes, day } } ; null si inconnu
export function openState(text, now = new Date()) {
  const week = parseHours(text)
  if (!week) return null
  const today = (now.getDay() + 6) % 7
  const min = now.getHours() * 60 + now.getMinutes()
  // ouvert depuis la veille (après minuit) ?
  for (const [a, b] of week[(today + 6) % 7]) if (b > 1440 && min < b - 1440) return { open: true, until: hm(b) }
  for (const [a, b] of week[today]) if (min >= a && min < b) return { open: true, until: b >= 1440 && a === 0 && b === 1440 ? null : hm(b) }
  for (let k = 0; k < 7; k++) {
    const day = week[(today + k) % 7]
    for (const [a] of day) if (k > 0 || a > min) return { open: false, next: { inDays: k, at: hm(a), day: (today + k) % 7 } }
  }
  return { open: false, next: null }
}

// Chercher un endroit (rue, ville…) avec Photon (OpenStreetMap, gratuit, sans clé).
// near : pour donner la priorité aux résultats proches de moi.
async function photonGeocode(q, { near, signal } = {}) {
  const lang = ['fr', 'en', 'de'].includes(locale().slice(0, 2)) ? locale().slice(0, 2) : 'default'
  const params = new URLSearchParams({ q, limit: '5', lang })
  if (near) {
    params.set('lat', near.lat.toFixed(4))
    params.set('lon', near.lon.toFixed(4))
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  signal?.addEventListener('abort', () => ctrl.abort())
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer))
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const json = await res.json()
  const seen = new Set()
  return (json.features || [])
    .map((f) => {
      const pr = f.properties || {}
      const street = [pr.housenumber, pr.street].filter(Boolean).join(' ')
      const title = pr.name || street || pr.city || ''
      const sub = [pr.name && street && street !== pr.name ? street : null, pr.postcode, pr.city && pr.city !== title ? pr.city : null, pr.country].filter(Boolean).join(', ')
      const [lon, lat] = f.geometry?.coordinates || []
      return { title, sub, lat, lon }
    })
    .filter((r) => r.title && Number.isFinite(r.lat) && !seen.has(`${r.title}|${r.sub}`) && seen.add(`${r.title}|${r.sub}`))
}

// Nominatim (OpenStreetMap) si Photon ne répond pas : même format de réponse
async function nominatimGeocode(q, { near, signal } = {}) {
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '5', addressdetails: '1', 'accept-language': locale().slice(0, 2) })
  if (near) {
    // priorité aux endroits proches (sans exclure le reste)
    params.set('viewbox', [near.lon - 1, near.lat + 1, near.lon + 1, near.lat - 1].map((x) => x.toFixed(3)).join(','))
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  signal?.addEventListener('abort', () => ctrl.abort())
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer))
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const rows = await res.json()
  return rows.map((r) => {
    const a = r.address || {}
    const street = [a.house_number, a.road].filter(Boolean).join(' ')
    const city = a.city || a.town || a.village || a.municipality || ''
    const title = r.name || street || city || r.display_name.split(',')[0]
    const sub = [street && street !== title ? street : null, a.postcode, city && city !== title ? city : null, a.country].filter(Boolean).join(', ')
    return { title, sub, lat: Number(r.lat), lon: Number(r.lon) }
  })
}

// Chercher un endroit : Photon (rapide), sinon Nominatim
export async function geocode(q, opts = {}) {
  try {
    return await photonGeocode(q, opts)
  } catch (e) {
    if (opts.signal?.aborted) throw e
    return nominatimGeocode(q, opts)
  }
}

// Dernière position connue (pour afficher la carte tout de suite, avant que le GPS réponde)
const LAST = 'wishdisc-last-pos'
export function lastPosition() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST) || 'null')
    return v && Date.now() - v.at < 7 * 86400000 ? { lat: v.lat, lon: v.lon } : null
  } catch {
    return null
  }
}
export function savePosition(p) {
  try {
    localStorage.setItem(LAST, JSON.stringify({ lat: p.lat, lon: p.lon, at: Date.now() }))
  } catch {
    // rien
  }
}