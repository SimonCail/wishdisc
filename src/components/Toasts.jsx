// Messages en bas de l'écran. Sur téléphone, ils passent au-dessus des onglets du bas.
// Un message peut avoir un bouton (ex. « Annuler ») et une barre qui montre le temps restant.
export default function Toasts({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 md:!bottom-5"
      // au-dessus des onglets et du bouton « + »
      style={{ bottom: 'calc(max(0.625rem, env(safe-area-inset-bottom)) + 9.5rem)' }}
    >
      {toasts.map((t) =>
        t.action ? (
          <div
            key={t.id}
            className="animate-pop pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-paper text-ink shadow-xl shadow-black/40"
          >
            <div className="flex items-center gap-3 py-1.5 pl-4 pr-1.5">
              <span className="min-w-0 flex-1 text-sm font-medium">{t.message}</span>
              <button
                onClick={() => {
                  t.action.onClick()
                  onDismiss?.(t.id)
                }}
                className="keep-day shrink-0 rounded-full px-3.5 py-2.5 text-sm font-black uppercase tracking-wide text-sun transition hover:bg-white/10"
              >
                {t.action.label}
              </button>
            </div>
            <div className="h-[3px] bg-ink/15">
              <div className="toast-timer keep-day h-full bg-sun" style={{ animationDuration: `${t.duration}ms` }} />
            </div>
          </div>
        ) : (
          <div
            key={t.id}
            className={`animate-pop flex items-center gap-2.5 rounded-full py-2.5 pl-4 pr-5 text-sm font-medium shadow-xl shadow-black/40 ${
              t.type === 'error' ? 'bg-red-500 text-white' : 'bg-paper text-ink'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${t.type === 'error' ? 'bg-white' : 'bg-sun'}`} />
            {t.message}
          </div>
        )
      )}
    </div>
  )
}