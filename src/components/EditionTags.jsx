// Petites étiquettes de l'édition (couleur, signé, numéro…), sur la carte et la fiche

export const PenIcon = (p) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M3 20c2.5-.4 4-2.2 5.5-4.2 1.3-1.8 3-2.3 3.8-1.2.9 1.2-.6 3.3.8 3.8 1.2.4 2.6-1.3 3.9-2.4" />
    <path d="m14.5 4.5 3 3L9 16l-3.5.5L6 13z" />
  </svg>
)

// La pastille de couleur (un dégradé pour marbré, splatter, picture disc…)
export function Swatch({ swatch, size = 10, className = '' }) {
  const neutral = !swatch || swatch === 'neutral'
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ring-1 ring-black/15 ${neutral ? 'border border-dashed border-muted' : ''} ${className}`}
      style={{ width: size, height: size, background: neutral ? 'transparent' : swatch }}
    />
  )
}

export default function EditionTags({ tags, size = 'sm', className = '' }) {
  if (!tags?.length) return null
  const big = size === 'md'
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Édition">
      {tags.map((t) => (
        <li
          key={t.key}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full border ${
            t.strong ? 'border-accent bg-accent/15 font-bold' : 'border-line bg-raised/60'
          } ${big ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px] font-medium'}`}
        >
          {t.swatch && <Swatch swatch={t.swatch} size={big ? 12 : 9} />}
          {t.icon === 'pen' && <PenIcon width={big ? 14 : 11} height={big ? 14 : 11} />}
          <span className="truncate">{t.label}</span>
        </li>
      ))}
    </ul>
  )
}
