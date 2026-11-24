import { useEffect } from 'react'
import Cover from './Cover'
import { CloseIcon } from './Icons'
import { btn } from '../lib/ui'
import { periodLabel, YEAR_RELEASE_DAY } from '../lib/wrapped'
import { locale, t, tn } from '../lib/i18n'

const counts = (w) => `${tn(w.added, '{n} ajouté', '{n} ajoutés')} · ${tn(w.granted, '{n} exaucé', '{n} exaucés')}`

// « Mes Wrapped » : tous les récaps déjà sortis, l'année en grand, les mois rangés par année
export default function WrappedArchive({ released, isNew, onOpen, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { years, months } = released
  // Une année = sa carte (si elle est sortie) puis ses mois, la plus récente d'abord
  const byYear = new Map()
  for (const w of [...years, ...months].sort((a, b) => b.year - a.year)) {
    if (!byYear.has(w.year)) byYear.set(w.year, { year: null, months: [] })
    if (w.period.kind === 'year') byYear.get(w.year).year = w
    else byYear.get(w.year).months.push(w)
  }
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextYearDate = new Date(now.getFullYear(), 11, YEAR_RELEASE_DAY)
  const yearOut = now >= nextYearDate
  const New = () => <span className="keep-day rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold uppercase text-white">{t('Nouveau')}</span>

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Mes Wrapped')}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop nice-scroll max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-2xl font-black uppercase">{t('Mes Wrapped')}</h3>
          <button onClick={onClose} aria-label={t('Fermer')} className={btn.icon}>
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        {/* Le prochain : l'attente fait partie du jeu */}
        <p className="mb-4 text-sm text-muted">
          {t('Le prochain sort le {date}.', {
            date: (yearOut || nextMonth < nextYearDate ? nextMonth : nextYearDate).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }),
          })}
        </p>

        {years.length === 0 && months.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
            {t('Ton premier Wrapped arrive au début du mois prochain. Ajoute des disques d’ici là !')}
          </p>
        )}

        {[...byYear].map(([year, g]) => (
          <section key={year} className="mb-6">
            {g.year && (
              <button
                onClick={() => onOpen(g.year)}
                className="keep-day mb-3 flex w-full items-center gap-4 rounded-3xl p-4 text-left text-[#f5f1e8] transition hover:brightness-110"
                style={{ background: 'linear-gradient(150deg,#1d4a3a,#0c1f18)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-[#f1c04e]">
                    {t('L’ANNÉE')} {isNew(g.year) && <New />}
                  </p>
                  <p className="font-display text-3xl font-black uppercase leading-none">{t('Ton {period}', { period: year })}</p>
                  <p className="mt-1.5 text-sm text-[#c8d2ca]">{counts(g.year)}</p>
                </div>
                {g.year.record && <Cover url={g.year.record.cover_url} className="aspect-square w-20 shrink-0 rounded-lg shadow-xl" />}
              </button>
            )}
            {g.months.length > 0 && (
              <>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('Les mois de {year}', { year })}</p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {g.months.map((w) => (
                    <li key={w.id}>
                      <button onClick={() => onOpen(w)} className="w-full rounded-2xl border border-line bg-ink/40 p-2 text-left transition hover:border-accent">
                        <div className="relative">
                          <Cover url={w.record?.cover_url} className="aspect-square w-full rounded-lg" />
                          {isNew(w) && (
                            <span className="absolute left-1 top-1">
                              <New />
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 truncate font-display text-sm font-black uppercase leading-none">{periodLabel(w.period)}</p>
                        <p className="mt-1 text-[11px] leading-tight text-muted">
                          {tn(w.added, '{n} ajouté', '{n} ajoutés')}
                          <br />
                          {tn(w.granted, '{n} exaucé', '{n} exaucés')}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
