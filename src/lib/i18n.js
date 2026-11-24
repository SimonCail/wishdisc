// --- Langues du site ---
// Le français est la langue de base : les textes de l'app sont écrits en français,
// et t('Texte en français') renvoie la traduction de la langue choisie.
// Les traductions sont dans src/locales/<langue>.js (une table « français → traduction »).
// Une phrase sans traduction s'affiche simplement en français.

export const LANGS = [
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'it', name: 'Italiano', locale: 'it-IT' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
]
const CODES = new Set(LANGS.map((l) => l.code))
const STORE_KEY = 'wishdisc-lang'

const loaders = {
  en: () => import('../locales/en.js'),
  es: () => import('../locales/es.js'),
  it: () => import('../locales/it.js'),
  de: () => import('../locales/de.js'),
}

let lang = 'fr'
let dict = null
let plural = new Intl.PluralRules('fr-FR')

// Langue choisie sur cet appareil, sinon celle du téléphone / navigateur, sinon le français
export function detectLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved && CODES.has(saved)) return saved
  } catch {
    // pas grave
  }
  for (const l of navigator.languages || [navigator.language || '']) {
    const code = String(l).slice(0, 2).toLowerCase()
    if (CODES.has(code)) return code
  }
  return 'fr'
}

// À appeler une fois, avant d'afficher l'app
export async function initI18n(code = detectLang()) {
  lang = CODES.has(code) ? code : 'fr'
  dict = null
  if (lang !== 'fr') {
    try {
      dict = (await loaders[lang]()).default
    } catch {
      // traduction introuvable (hors-ligne la première fois…) : français
      lang = 'fr'
    }
  }
  plural = new Intl.PluralRules(locale())
  document.documentElement.lang = lang
}

export const currentLang = () => lang
export const locale = () => LANGS.find((l) => l.code === lang)?.locale ?? 'fr-FR'

// Changer de langue : retenu sur l'appareil, puis l'app se recharge dans la nouvelle langue
export function setLang(code) {
  try {
    localStorage.setItem(STORE_KEY, code)
  } catch {
    // pas grave
  }
  window.location.reload()
}

// t('Bonjour {name}', { name }) → « Hello Léa »
export function t(text, vars) {
  let out = (dict && dict[text]) || text
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
  return out
}

// Singulier / pluriel selon la langue : tn(n, '{n} disque', '{n} disques')
export function tn(n, one, other, vars) {
  return t(plural.select(n) === 'one' ? one : other, { n, ...vars })
}

// Comparer deux textes (tri alphabétique) dans la langue choisie
export const compareText = (a = '', b = '') => a.localeCompare(b, lang)
