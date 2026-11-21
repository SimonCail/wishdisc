// Les 4 modèles de boutons de l'app (tous en pilule)
// primary   : l'action principale de l'écran (une seule par écran)
// secondary : les autres actions
// quiet     : liens et petites actions
// danger    : ce qui efface quelque chose
const base = 'inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition disabled:opacity-50 disabled:pointer-events-none'

export const btn = {
  primary: `${base} bg-accent px-5 py-2.5 text-sm text-ink hover:bg-accent-soft`,
  secondary: `${base} border border-line px-4 py-2.5 text-sm font-medium hover:border-accent hover:bg-raised`,
  quiet: `${base} px-2 py-2 text-sm font-medium text-muted underline-offset-4 hover:text-paper hover:underline`,
  danger: `${base} bg-red-500 px-5 py-2.5 text-sm text-white hover:bg-red-400`,
  // Bouton avec seulement une icône : 44 px, toujours avec un aria-label
  icon: 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-paper',
}
