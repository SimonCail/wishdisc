import { useEffect } from 'react'
import Cover from './Cover'
import { Avatar } from './Avatar'
import { CloseIcon } from './Icons'
import { borrowerOf, daysSince, dueLabel, isLate } from './LoanBlock'
import { btn } from '../lib/ui'
import { t, tn } from '../lib/i18n'

// « Mes prêts » : qui a quel disque, depuis quand (les plus anciens d'abord)
export default function LoansSheet({ loans, vinylOf, people, offline, onReturn, onOpen, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows = loans
    .map((l) => ({ loan: l, vinyl: vinylOf(l.vinyl_id) }))
    .filter((r) => r.vinyl)
    .sort((a, b) => (a.loan.due_date || '9999') .localeCompare(b.loan.due_date || '9999') || (a.loan.lent_at < b.loan.lent_at ? -1 : 1))

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Mes prêts')}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop nice-scroll max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl font-black uppercase">{t('Mes prêts')}</h3>
          <button onClick={onClose} aria-label={t('Fermer')} className={btn.icon}>
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-muted">{t('Aucun disque prêté en ce moment.')}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ loan, vinyl }) => {
              const who = borrowerOf(loan, people)
              const days = daysSince(loan.lent_at)
              const late = isLate(loan)
              return (
                <li key={loan.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 ${late ? 'border-coral' : 'border-line'}`}>
                  <button onClick={() => onOpen(vinyl)} className="shrink-0" aria-label={t('Ouvrir {title}', { title: vinyl.title })}>
                    <Cover url={vinyl.cover_url} className="h-14 w-14 rounded-md" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{vinyl.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                      {who.id && <Avatar member={who} size={16} ring={false} />}
                      {t('Chez {name}', { name: who.name })}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        late ? 'keep-day bg-coral text-white' : 'bg-raised text-muted'
                      }`}
                    >
                      {days === 0 ? t('depuis aujourd’hui') : tn(days, 'depuis {n} jour', 'depuis {n} jours')}
                    </span>
                    <span className={`ml-1.5 text-[11px] ${late ? 'font-bold text-coral' : 'text-muted'}`}>{dueLabel(loan)}</span>
                  </div>
                  <button onClick={() => onReturn(loan)} disabled={offline} className={`${btn.secondary} shrink-0 px-3 py-1.5 text-sm`}>
                    {t('Rendu')}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}