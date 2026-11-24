import { locale } from './i18n'
const euro = new Intl.NumberFormat(locale(), {
  style: 'currency',
  currency: 'EUR',
})

export const formatPrice = (n) => (n == null ? null : euro.format(n))
