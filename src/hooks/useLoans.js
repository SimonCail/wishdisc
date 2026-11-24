import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

// Les prêts de mes disques en cours (script 24, date de retour : script 27)
const COLS = 'id, vinyl_id, borrower_id, borrower_name, lent_at, due_date, return_asked_at'
const OLD_COLS = 'id, vinyl_id, borrower_id, borrower_name, lent_at'
const noColumn = (e) => e?.code === '42703' || e?.code === 'PGRST204' || /due_date|return_asked_at/.test(e?.message || '')
// byVinyl : Map id du disque (texte) → prêt en cours
export default function useLoans(userId) {
  const [loans, setLoans] = useState([])
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    const get = (cols) => supabase.from('loans').select(cols).eq('owner_id', userId).is('returned_at', null).order('lent_at')
    let { data, error } = await get(COLS)
    if (error && noColumn(error)) ({ data, error } = await get(OLD_COLS)) // script 27 pas encore lancé
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || /loans/.test(error.message || '')) setMissing(true)
      return
    }
    setMissing(false)
    setLoans(data ?? [])
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const byVinyl = useMemo(() => new Map(loans.map((l) => [String(l.vinyl_id), l])), [loans])

  // Prêter à un ami (borrower) ou à quelqu'un qui n'est pas sur Wishdisc (name)
  // dueDate : « 2026-12-24 » ou null (sans date)
  async function lend(vinylId, { borrowerId = null, name = null, dueDate = null }) {
    const row = { vinyl_id: vinylId, borrower_id: borrowerId, borrower_name: name?.trim().slice(0, 40) || null }
    if (dueDate) row.due_date = dueDate
    const { data, error } = await supabase.from('loans').insert(row).select(dueDate ? COLS : OLD_COLS).single()
    if (error) {
      if (noColumn(error)) return t('Lance d’abord le script 27-prets-date-retour.sql dans Supabase.')
      if (error.code === '23505') return t('Ce disque est déjà prêté.')
      if (error.code === '42P01' || error.code === 'PGRST205') return t('Lance d’abord le script 24-prets-et-anniversaires.sql dans Supabase.')
      return error.message
    }
    setLoans((l) => [...l, { lent_at: new Date().toISOString(), ...data }])
    return null
  }

  // Le disque est revenu
  async function giveBack(loan) {
    const { error } = await supabase.from('loans').update({ returned_at: new Date().toISOString() }).eq('id', loan.id)
    if (error) return error.message
    setLoans((l) => l.filter((x) => x.id !== loan.id))
    return null
  }

  // « Demander de le rendre » : on retient quand (le message part par la messagerie)
  async function markAsked(loan) {
    const at = new Date().toISOString()
    const { error } = await supabase.from('loans').update({ return_asked_at: at }).eq('id', loan.id)
    if (error && !noColumn(error)) return error.message
    setLoans((l) => l.map((x) => (x.id === loan.id ? { ...x, return_asked_at: at } : x)))
    return null
  }

  return { loans, byVinyl, missing, lend, giveBack, markAsked, reload: load }
}