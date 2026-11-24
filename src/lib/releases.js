// « Bientôt dans les bacs » : les prochains albums des artistes de ma liste, via MusicBrainz
// (base ouverte, utilisable dans une app publique). Une seule requête pour tous les artistes,
// gardée 12 h sur l'appareil pour rester poli avec leur serveur.
import { readJSON, writeJSON } from './cache'
import { norm } from './suggest'

const KEY = 'wishdisc-releases-v2'
const TTL = 12 * 3600 * 1000
const MAX_ARTISTS = 25

// « Damso* », « Daft Punk (2) » → « Damso », « Daft Punk »
const clean = (name = '') => name.replace(/\*$/, '').replace(/\s\(\d+\)$/, '').trim()
const artistKey = (name = '') => norm(clean(name).replace(/^the\s+/i, ''))

// Les artistes qui reviennent le plus dans ma liste (souhaits et collection)
export function topArtists(items, max = MAX_ARTISTS) {
  const counts = new Map()
  for (const it of items) {
    const name = clean(it.artist)
    if (!name || /^various|^divers/i.test(name)) continue
    const k = artistKey(name)
    const cur = counts.get(k) || { name, n: 0 }
    cur.n += 1
    counts.set(k, cur)
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, max).map((a) => a.name)
}

// On montre aussi ce qui vient de sortir (30 derniers jours)
const since = () => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
const quote = (s) => `"${s.replace(/["\\]/g, ' ').trim()}"`

export function releasesUrl(artists, from = since()) {
  const who = artists.map((a) => `artist:${quote(a)}`).join(' OR ')
  const query = `(${who}) AND (primarytype:album OR primarytype:ep) AND firstreleasedate:[${from} TO *]`
  return `https://musicbrainz.org/ws/2/release-group?fmt=json&limit=100&query=${encodeURIComponent(query)}`
}

// Réponse MusicBrainz → [{ id, title, artist, date, type, cover_url }]
// Les dates peuvent être au jour (« 2027-03-14 ») ou seulement au mois (« 2027-03 ») quand le jour n'est pas annoncé
export function parseReleases(json, artists, from = since()) {
  const wanted = new Set(artists.map(artistKey))
  const seen = new Set()
  const out = []
  for (const rg of json?.['release-groups'] || []) {
    const date = rg['first-release-date'] || ''
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(date) || date < from.slice(0, date.length)) continue
    // Pas de live, compilation, remix… : seulement les vrais nouveaux disques
    if ((rg['secondary-types'] || []).length) continue
    const credit = rg['artist-credit'] || []
    const artist = credit.map((c) => (c.name || c.artist?.name || '') + (c.joinphrase || '')).join('').trim()
    // La recherche est souple : on ne garde que les artistes vraiment dans ma liste
    if (!credit.some((c) => wanted.has(artistKey(c.name || c.artist?.name)))) continue
    const k = `${artistKey(artist)}|${norm(rg.title)}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({
      id: rg.id,
      title: rg.title,
      artist,
      date,
      byMonth: date.length === 7,
      type: rg['primary-type'] || 'Album',
      cover_url: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
    })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export async function fetchReleases(items) {
  const artists = topArtists(items)
  if (artists.length === 0) return []
  const sig = artists.map(artistKey).sort().join(',')
  const cached = readJSON(KEY)
  if (cached && cached.sig === sig && Date.now() - cached.at < TTL) {
    return cached.list.filter((r) => r.date >= since().slice(0, r.date.length))
  }
  const res = await fetch(releasesUrl(artists), { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}`)
  const list = parseReleases(await res.json(), artists)
  writeJSON(KEY, { sig, at: Date.now(), list })
  return list
}

// Pour savoir si une sortie est déjà dans ma liste
export const releaseKey = (r) => `${artistKey(r.artist)}|${norm(r.title)}`