// « Wishdisc Wrapped » : un récap par mois, et un récap de l'année.
// - Celui d'un mois sort le 1er du mois suivant (mis en avant la première semaine).
// - Celui de l'année sort le 26 décembre (mis en avant jusqu'à fin janvier).
// Une fois sortis, ils restent dans « Mes Wrapped ».
import { locale, t } from './i18n'

export const YEAR_RELEASE_DAY = 26 // en décembre
const FRESH_MONTH_DAYS = 7

// period : { kind: 'month', year, month (0-11) } ou { kind: 'year', year }
export const periodId = (p) => (p.kind === 'year' ? String(p.year) : `${p.year}-${String(p.month + 1).padStart(2, '0')}`)

export function periodLabel(p) {
  if (p.kind === 'year') return String(p.year)
  return new Date(p.year, p.month, 1).toLocaleDateString(locale(), { month: 'long' })
}
export function periodLabelLong(p) {
  if (p.kind === 'year') return String(p.year)
  return new Date(p.year, p.month, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
}

function inPeriod(iso, p) {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === p.year && (p.kind === 'year' || d.getMonth() === p.month)
}

// Les n plus fréquents : [{ key, n }]
function topN(list, keyOf, n = 5) {
  const counts = new Map()
  for (const it of list) {
    for (const k of [].concat(keyOf(it) || [])) if (k) counts.set(k, (counts.get(k) || 0) + 1)
  }
  return [...counts].map(([key, c]) => ({ key, n: c })).sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key))).slice(0, n)
}

function top(list, keyOf) {
  const counts = new Map()
  for (const it of list) {
    for (const k of [].concat(keyOf(it) || [])) if (k) counts.set(k, (counts.get(k) || 0) + 1)
  }
  let best = null
  for (const [k, n] of counts) if (!best || n > best.n) best = { key: k, n }
  return best
}

// items : mes disques (souhaits et collection)
export function computeWrapped(items, period) {
  const added = items.filter((it) => inPeriod(it.created_at, period))
  const granted = items.filter((it) => it.status === 'owned' && inPeriod(it.owned_at, period))
  // Les goûts : sur la période. Pour l'année, si elle est trop vide, sur toute la liste.
  const ofPeriod = [...new Map([...added, ...granted].map((it) => [it.id, it])).values()]
  const base = period.kind === 'year' && ofPeriod.length < 5 ? items : ofPeriod
  const withCover = (list) => list.filter((it) => it.cover_url)
  const genres = base.length ? topN(base, (it) => it.genres?.[0]).map((g) => ({ name: g.key, n: g.n, pct: Math.round((g.n / base.length) * 100) })) : []
  const coverOf = (name) => withCover(base.filter((it) => it.artist === name))[0]?.cover_url ?? null
  const artists = topN(base, (it) => it.artist).map((a) => ({ name: a.key, n: a.n, cover: coverOf(a.key) }))
  const genre = genres[0] ? { key: genres[0].name, n: genres[0].n } : null
  const artist = artists[0] ? { key: artists[0].name, n: artists[0].n } : null
  const decade = top(base.filter((it) => it.year > 1900), (it) => Math.floor(it.year / 10) * 10)
  const record =
    withCover(granted).sort((a, b) => (a.owned_at < b.owned_at ? 1 : -1))[0] ||
    withCover(added).sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] ||
    (period.kind === 'year' ? withCover(items)[0] : null) ||
    null
  const artistCover = artist ? withCover(base.filter((it) => it.artist === artist.key))[0]?.cover_url : null
  return {
    period,
    id: periodId(period),
    year: period.year,
    added: added.length,
    granted: granted.length,
    wishes: items.filter((it) => it.status === 'wish').length,
    genre: genre && base.length ? { name: genre.key, pct: Math.round((genre.n / base.length) * 100) } : null,
    artist: artist ? { name: artist.key, n: artist.n, cover: artistCover } : null,
    genres,
    artists,
    decade: decade ? decade.key : null,
    record,
    empty: added.length === 0 && granted.length === 0,
  }
}

const yearReleased = (y, now) => now.getFullYear() > y || (now.getMonth() === 11 && now.getDate() >= YEAR_RELEASE_DAY)

// Tous les Wrapped déjà sortis (avec au moins un disque), du plus récent au plus ancien
export function releasedWrapped(items, now = new Date()) {
  const dates = items.flatMap((it) => [it.created_at, it.status === 'owned' ? it.owned_at : null]).filter(Boolean).map((d) => new Date(d))
  if (!dates.length) return { years: [], months: [] }
  const first = new Date(Math.min(...dates))
  const months = []
  // jusqu'au mois dernier (le mois en cours n'est pas fini)
  for (let y = first.getFullYear(), m = first.getMonth(); y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth()); m === 11 ? (y++, (m = 0)) : m++) {
    const w = computeWrapped(items, { kind: 'month', year: y, month: m })
    if (!w.empty) months.push(w)
  }
  const years = []
  for (let y = first.getFullYear(); y <= now.getFullYear(); y++) {
    if (!yearReleased(y, now)) continue
    const w = computeWrapped(items, { kind: 'year', year: y })
    if (!w.empty) years.push(w)
  }
  return { years: years.reverse(), months: months.reverse() }
}

// Ce qui vient de sortir et mérite le bandeau (l'année d'abord, sinon le mois)
export function freshPeriods(now = new Date()) {
  const out = []
  const m = now.getMonth()
  if (m === 11 && now.getDate() >= YEAR_RELEASE_DAY) out.push({ kind: 'year', year: now.getFullYear() })
  if (m === 0) out.push({ kind: 'year', year: now.getFullYear() - 1 })
  if (now.getDate() <= FRESH_MONTH_DAYS) {
    out.push(m === 0 ? { kind: 'month', year: now.getFullYear() - 1, month: 11 } : { kind: 'month', year: now.getFullYear(), month: m - 1 })
  }
  return out
}

// Petits textes qui changent selon mois / année
export const wrappedTexts = (p) =>
  p.kind === 'year'
    ? {
        artist: t('Ton artiste de l’année'),
        record: t('Ton disque de l’année'),
        myRecord: t('Mon disque de l’année'),
        bye: t('À l’année prochaine,'),
      }
    : {
        artist: t('Ton artiste du mois'),
        record: t('Ton disque du mois'),
        myRecord: t('Mon disque du mois'),
        bye: t('Au mois prochain,'),
      }
