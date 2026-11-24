import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

// Les anniversaires (script 24) : le mien, et ceux que j'ai le droit de voir
// (mes amis et les membres de mes salons).
export default function useBirthdays(userId) {
  const [rows, setRows] = useState([])
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('birthdays').select('user_id, month, day, year')
    if (error) {
      setMissing(true)
      return
    }
    setMissing(false)
    setRows(data ?? [])
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const mine = rows.find((r) => r.user_id === userId) ?? null

  // Enregistrer (ou effacer avec null) mon anniversaire
  async function setMine(value) {
    if (!value) {
      const { error } = await supabase.from('birthdays').delete().eq('user_id', userId)
      if (error) return error.message
      setRows((r) => r.filter((x) => x.user_id !== userId))
      return null
    }
    const row = { user_id: userId, month: value.month, day: value.day, year: value.year || null }
    const { error } = await supabase.from('birthdays').upsert(row)
    if (error) return missing || /birthdays/.test(error.message || '') ? t('Lance d’abord le script 24-prets-et-anniversaires.sql dans Supabase.') : error.message
    setRows((r) => [...r.filter((x) => x.user_id !== userId), row])
    return null
  }

  return { rows, mine, missing, setMine, reload: load }
}

// Le prochain anniversaire : { date, days, age } (age seulement si l'année est connue)
export function nextBirthday(b, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let date = new Date(today.getFullYear(), b.month - 1, b.day)
  if (date < today) date = new Date(today.getFullYear() + 1, b.month - 1, b.day)
  const days = Math.round((date - today) / 86400000)
  return { date, days, age: b.year ? date.getFullYear() - b.year : null }
}
