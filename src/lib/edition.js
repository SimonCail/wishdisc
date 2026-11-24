import { t } from './i18n'
// --- « Mon édition » : couleur, signé, numéroté, type d'édition, état ---
// Tout est rangé dans la colonne vinyls.edition (jsonb), rempli par l'utilisateur.
// Forme : { color, signed, number, of, kind, shop, condition, exact }
//   color     : une clé de COLORS, ou un texte libre (« Vert sapin »)
//   number/of : numéroté 245 sur 1000 (of peut manquer)
//   kind      : une clé de KINDS ; shop : chez qui pour une exclusivité (Fnac…)
//   condition : une clé de CONDITIONS (collection seulement)
//   exact     : souhait seulement. true = cette édition précise, false = peu importe

export const COLORS = [
  { key: 'black', label: t('Noir'), swatch: '#151515' },
  { key: 'white', label: t('Blanc'), swatch: '#f4f1ea' },
  { key: 'red', label: t('Rouge'), swatch: '#d8342c' },
  { key: 'orange', label: t('Orange'), swatch: '#ef7d22' },
  { key: 'yellow', label: t('Jaune'), swatch: '#f3c623' },
  { key: 'green', label: t('Vert'), swatch: '#2f9a57' },
  { key: 'blue', label: t('Bleu'), swatch: '#2b62c9' },
  { key: 'purple', label: t('Violet'), swatch: '#7a45c4' },
  { key: 'pink', label: t('Rose'), swatch: '#ef8fb5' },
  { key: 'gold', label: t('Or'), swatch: 'linear-gradient(135deg,#f6dd8a,#b8862b 60%,#f3d277)' },
  { key: 'clear', label: t('Transparent'), swatch: 'linear-gradient(135deg,rgba(255,255,255,.85),rgba(200,220,230,.35))' },
  { key: 'marbled', label: t('Marbré'), swatch: 'conic-gradient(from 30deg,#d8342c,#f4f1ea,#2b62c9,#f4f1ea,#d8342c)' },
  { key: 'splatter', label: t('Splatter'), swatch: 'radial-gradient(circle at 30% 35%,#151515 0 14%,transparent 15%),radial-gradient(circle at 68% 62%,#d8342c 0 13%,transparent 14%),radial-gradient(circle at 60% 25%,#151515 0 8%,transparent 9%),#f3c623' },
  { key: 'picture', label: t('Picture disc'), swatch: 'linear-gradient(135deg,#ef8fb5,#f3c623 50%,#2b62c9)' },
]
const COLOR_BY_KEY = new Map(COLORS.map((c) => [c.key, c]))

export const KINDS = [
  { key: 'limited', label: t('Édition limitée') },
  { key: 'exclusive', label: t('Exclusivité') },
  { key: 'original', label: t('Pressage d’origine') },
  { key: 'reissue', label: t('Réédition') },
]
const KIND_BY_KEY = new Map(KINDS.map((k) => [k.key, k]))

export const CONDITIONS = [
  { key: 'sealed', label: t('Neuf, scellé') },
  { key: 'mint', label: t('Comme neuf') },
  { key: 'good', label: t('Bon état') },
  { key: 'worn', label: t('Abîmé') },
]
const CONDITION_BY_KEY = new Map(CONDITIONS.map((c) => [c.key, c]))

// Couleur à afficher : une des couleurs connues, ou un texte libre avec une pastille neutre
export function colorOf(ed) {
  const c = ed?.color
  if (!c) return null
  return COLOR_BY_KEY.get(c) ?? { key: 'other', label: c, swatch: null }
}

const clean = (s) => (typeof s === 'string' ? s.trim() : '')
const posInt = (n) => {
  const v = Number.parseInt(n, 10)
  return Number.isFinite(v) && v > 0 && v < 1e7 ? v : null
}

// Nettoie ce qui sort du formulaire : on ne garde que ce qui est rempli
export function normalizeEdition(ed, mode) {
  const out = {}
  const color = clean(ed.color).slice(0, 40)
  if (color) out.color = color
  if (ed.signed) out.signed = true
  const number = posInt(ed.number)
  const of = posInt(ed.of)
  if (number) out.number = number
  if (of && (!number || of >= number)) out.of = of
  if (KIND_BY_KEY.has(ed.kind)) out.kind = ed.kind
  const shop = clean(ed.shop).slice(0, 40)
  if (out.kind === 'exclusive' && shop) out.shop = shop
  if (mode === 'owned' && CONDITION_BY_KEY.has(ed.condition)) out.condition = ed.condition
  if (mode === 'wish' && typeof ed.exact === 'boolean') out.exact = ed.exact
  return out
}

export const hasEdition = (ed) => !!ed && Object.keys(ed).length > 0

const numberLabel = (ed) =>
  ed.number ? (ed.of ? t('N° {number} sur {of}', { number: ed.number, of: ed.of }) : t('N° {number}', { number: ed.number })) : ed.of ? t('Tirage à {of}', { of: ed.of }) : null

// Les étiquettes à afficher (fiche complète)
export function editionTags(ed, mode) {
  if (!hasEdition(ed)) return []
  const tags = []
  const color = colorOf(ed)
  if (color) tags.push({ key: 'color', label: color.label, swatch: color.swatch ?? 'neutral' })
  if (ed.signed) tags.push({ key: 'signed', label: t('Signé'), icon: 'pen' })
  const num = numberLabel(ed)
  if (num) tags.push({ key: 'number', label: num })
  if (ed.kind) {
    const k = KIND_BY_KEY.get(ed.kind)
    if (k) tags.push({ key: 'kind', label: ed.kind === 'exclusive' && ed.shop ? `Exclu ${ed.shop}` : k.label })
  }
  if (mode === 'owned' && ed.condition) {
    const c = CONDITION_BY_KEY.get(ed.condition)
    if (c) tags.push({ key: 'condition', label: c.label })
  }
  if (mode === 'wish' && ed.exact === true) tags.push({ key: 'exact', label: t('Cette édition précise'), strong: true })
  if (mode === 'wish' && ed.exact === false) tags.push({ key: 'exact', label: t('Peu importe l’édition') })
  return tags
}

// Version courte pour la carte : les 2 infos les plus parlantes
export function cardTags(ed) {
  if (!hasEdition(ed)) return []
  const tags = []
  const color = colorOf(ed)
  if (color && color.key !== 'black') tags.push({ key: 'color', label: color.label, swatch: color.swatch ?? 'neutral' })
  if (ed.signed) tags.push({ key: 'signed', label: t('Signé'), icon: 'pen' })
  if (tags.length < 2) {
    const num = numberLabel(ed)
    if (num) tags.push({ key: 'number', label: ed.number ? t('N° {number}', { number: ed.number }) : num })
  }
  if (tags.length < 2 && (ed.kind === 'limited' || ed.kind === 'exclusive')) {
    tags.push({ key: 'kind', label: ed.kind === 'exclusive' ? (ed.shop ? `Exclu ${ed.shop}` : t('Exclu')) : t('Limitée') })
  }
  return tags.slice(0, 2)
}

// --- Filtre « Particularités » ---
export const SPECIALS = [
  { key: 'signed', label: t('Signés'), test: (ed) => !!ed?.signed },
  { key: 'colored', label: t('En couleur'), test: (ed) => !!ed?.color && ed.color !== 'black' },
  { key: 'numbered', label: t('Numérotés'), test: (ed) => !!(ed?.number || ed?.of) },
  { key: 'limited', label: t('Limités ou exclus'), test: (ed) => ed?.kind === 'limited' || ed?.kind === 'exclusive' },
]
const SPECIAL_BY_KEY = new Map(SPECIALS.map((s) => [s.key, s]))

export const matchSpecial = (v, key) => !key || !!SPECIAL_BY_KEY.get(key)?.test(v.edition)
export const specialLabel = (key) => SPECIAL_BY_KEY.get(key)?.label ?? ''

// Les particularités présentes dans la liste, avec leur nombre
export function getSpecials(list) {
  return SPECIALS.map((s) => ({ name: s.key, label: s.label, count: list.filter((v) => s.test(v.edition)).length })).filter(
    (s) => s.count > 0
  )
}

// Pour les idées cadeaux : ce que la personne accepte comme édition
// { label, easy } ou null. easy = n'importe quel pressage fait l'affaire.
export function giftEditionHint(ed) {
  if (!hasEdition(ed)) return null
  if (ed.exact === false) return { label: t('Peu importe l’édition'), easy: true }
  if (ed.exact !== true) return null
  const parts = editionTags(ed, 'wish')
    .filter((tx) => tx.key !== 'exact')
    .map((tx) => (tx.key === 'color' ? tx.label.toLowerCase() : tx.label.toLowerCase()))
  return { label: parts.length ? t('Édition {join}', { join: parts.join(', ') }) : t('Cette édition précise'), easy: false }
}
