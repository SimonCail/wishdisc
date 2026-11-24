import { ArrowIcon, PinIcon } from './Icons'
import { storeLinks } from '../lib/stores'
import { t } from '../lib/i18n'

// « Acheter neuf » : un bouton par enseigne, qui ouvre sa recherche déjà remplie.
// barcode : code-barres du pressage (si Discogs le donne), sinon recherche par titre.
export default function StoreLinks({ vinyl, barcode, onShops }) {
  const links = storeLinks(vinyl, barcode)
  const byBarcode = links[0]?.byBarcode

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted">{t('Acheter neuf')}</h3>
        <p className="font-mono text-[11px] text-muted">{byBarcode ? t('par code-barres') : t('par titre')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('Voir « {title} » chez {name}', { title: vinyl.title, name: l.name })}
            className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium transition hover:border-accent hover:bg-raised"
          >
            <span className="truncate">{l.name}</span>
            <ArrowIcon width={15} height={15} className="shrink-0 text-muted transition group-hover:text-accent" />
          </a>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t('Ouvre la recherche de l’enseigne dans un nouvel onglet : prix, promos et stock en ligne.')}</p>
      {onShops && (
        <button
          onClick={onShops}
          className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left text-sm transition hover:border-accent hover:bg-raised"
        >
          <PinIcon width={18} height={18} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t('Chez un disquaire près de moi')}</span>
            <span className="block text-xs text-muted">{t('La carte des magasins de disques autour de toi')}</span>
          </span>
          <ArrowIcon width={15} height={15} className="shrink-0 text-muted" />
        </button>
      )}
    </section>
  )
}
