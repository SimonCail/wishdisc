import { t } from './i18n'
// Les 3 niveaux d'envie d'un souhait (les étoiles)
export const ENVIE = {
  1: t('Un peu'),
  2: t('Beaucoup'),
  3: t('À la folie'),
}

export const envieLabel = (n) => ENVIE[n] ?? t('Pas de niveau')
