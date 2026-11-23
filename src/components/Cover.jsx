import { useEffect, useState } from 'react'

// Petit disque dessiné : en attendant la pochette, ou s'il n'y en a pas
function Placeholder() {
  return (
    <svg viewBox="0 0 100 100" className="absolute left-1/4 top-1/4 h-1/2 w-1/2" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="#1b2420" opacity="0.85" />
      <circle cx="50" cy="50" r="15" fill="#f1c04e" />
      <circle cx="50" cy="50" r="2.5" fill="#f4eee3" />
    </svg>
  )
}

// La pochette d'un disque.
// Le carré est toujours plein (fond + petit disque) pendant que l'image arrive :
// sans ça, une pochette lente à charger laissait voir le vinyle derrière la carte.
// Si l'image ne vient pas (réseau lent, Discogs saturé), on réessaie une fois.
export default function Cover({ url, className = '' }) {
  const [state, setState] = useState({ url: null, loaded: false, tries: 0, failed: false })
  // Nouvelle adresse : on repart de zéro (calculé pendant l'affichage, sans effet)
  const current = state.url === url ? state : { url, loaded: false, tries: 0, failed: false }
  if (current !== state) setState(current)

  // 2e essai, 2 s après un échec
  useEffect(() => {
    if (!current.failed || current.tries > 1) return
    const t = setTimeout(() => setState((s) => (s.url === url ? { ...s, failed: false } : s)), 2000)
    return () => clearTimeout(t)
  }, [current.failed, current.tries, url])

  const showImage = url && !(current.failed && current.tries > 1)

  return (
    <span className={`relative block overflow-hidden bg-raised ${className}`}>
      {!current.loaded && <Placeholder />}
      {showImage && !current.failed && (
        <img
          key={current.tries}
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
          // Déjà en cache : l'image est prête avant même l'affichage
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && !current.loaded) {
              setState((s) => (s.url === url && !s.loaded ? { ...s, loaded: true } : s))
            }
          }}
          onLoad={() => setState((s) => (s.url === url ? { ...s, loaded: true } : s))}
          onError={() => setState((s) => (s.url === url ? { ...s, failed: true, tries: s.tries + 1 } : s))}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            current.loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </span>
  )
}