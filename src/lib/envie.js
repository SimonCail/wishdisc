// Les 3 niveaux d'envie d'un souhait (les étoiles)
export const ENVIE = {
  1: 'Un peu',
  2: 'Beaucoup',
  3: 'À la folie',
}

export const envieLabel = (n) => ENVIE[n] ?? 'Pas de niveau'
