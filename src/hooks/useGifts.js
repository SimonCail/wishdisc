import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

// « Je l'offre » : les disques réservés pour être offerts.
// La base ne renvoie que les réservations sur les disques des AUTRES :
// on ne voit jamais celles faites sur nos propres souhaits (la surprise est gardée).
export function useGifts(userId) {
  const [list, setList] = useState([]) // { vinyl_id, reserved_by, created_at }
  const [missing, setMissing] = useState(false) // script 20 pas encore lancé

  const load = useCallback(async () => {
    if (!userId) {
      setList([])
      return
    }
    const { data, error } = await supabase.from('gift_reservations').select('vinyl_id, reserved_by, created_at')
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || /gift_reservations/.test(error.message || '')) setMissing(true)
      return
    }
    setMissing(false)
    setList(data ?? [])
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return
    const channel = supabase
      .channel(`gifts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_reservations' }, () => load())
      .subscribe()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  // id du disque → réservation
  const byVinyl = useMemo(() => new Map(list.map((g) => [String(g.vinyl_id), g])), [list])

  async function reserve(vinylId) {
    const { error } = await supabase.from('gift_reservations').insert({ vinyl_id: vinylId, reserved_by: userId })
    if (error) {
      return error.code === '23505' ? 'Quelqu’un vient de le réserver, juste avant toi.' : error.message
    }
    setList((prev) => [...prev, { vinyl_id: vinylId, reserved_by: userId, created_at: new Date().toISOString() }])
    return null
  }

  async function cancel(vinylId) {
    const { error } = await supabase.from('gift_reservations').delete().eq('vinyl_id', vinylId).eq('reserved_by', userId)
    if (error) return error.message
    setList((prev) => prev.filter((g) => String(g.vinyl_id) !== String(vinylId)))
    return null
  }

  return { byVinyl, missing, reserve, cancel }
}
