// Les deux bacs : ce qu'on veut / ce qu'on a.
// Sur ordinateur, les boutons (Actualiser les prix, Partager) sont à droite des onglets.
// Sur téléphone, seul « Compléter les infos » passe sous le trait (mobileActions) :
// « Partager » est à côté du bouton des filtres. Les deux onglets se partagent la largeur (moitié chacun, trait sur toute la moitié).
export default function ShelfTabs({ tab, onTab, counts, actions, mobileActions }) {
  const tabs = [
    { value: 'wish', label: 'Souhaits' },
    { value: 'owned', label: 'Collection' },
  ]
  return (
    <div className="mb-5 sm:mb-8">
      <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
        <div role="tablist" className="grid w-full min-w-0 grid-cols-2 items-end sm:flex sm:w-auto sm:gap-8">
          {tabs.map((t) => {
            const active = tab === t.value
            return (
              <button
                key={t.value}
                role="tab"
                aria-selected={active}
                onClick={() => onTab?.(t.value)}
                className={`group relative flex min-w-0 items-end justify-center gap-1.5 transition sm:justify-start sm:gap-2 ${
                  active ? 'text-paper' : 'text-muted/50 hover:text-muted'
                }`}
              >
                <span className="truncate font-display text-[clamp(1.1rem,5.2vw,3rem)] font-black uppercase leading-[0.85] sm:text-[clamp(1.25rem,6.2vw,3rem)]">
                  {t.label}
                </span>
                <span
                  className={`mb-0.5 -rotate-6 rounded-full px-2 py-0.5 font-mono text-xs font-medium sm:mb-1 sm:px-2.5 ${
                    active ? 'bg-sun text-paper' : 'bg-raised text-muted'
                  }`}
                >
                  {counts[t.value]}
                </span>
                {/* trait sous l'onglet actif, posé pile sur la ligne du bas */}
                {active && <span className="absolute -bottom-[14px] left-0 h-[3px] w-full bg-paper" />}
              </button>
            )
          })}
        </div>
        {actions && <div className="hidden shrink-0 sm:block">{actions}</div>}
      </div>
      {mobileActions && <div className="mt-4 sm:hidden">{mobileActions}</div>}
    </div>
  )
}