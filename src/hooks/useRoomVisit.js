import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// « Depuis ta dernière visite » : la date de ma visite précédente dans ce salon.
// Elle est gardée dans mon compte (script 23), pour suivre d'un appareil à l'autre.
// On la lit une seule fois par salon et par ouverture de l'app, pour que les
// pastilles « Nouveau » ne disparaissent pas pendant qu'on regarde.
// Renvoie { since, clear } : since = date ISO, ou null (première visite / pas encore su)
const localKey = (roomId) => `wishdisc-room-seen-${roomId}`

export default function useRoomVisit(roomId, enabled = true) {
  const [seen, setSeen] = useState(() => new Map()) // salon → date de la visite précédente
  const asked = useRef(new Set()) // salons déjà demandés (une fois par ouverture)

  useEffect(() => {
    if (!roomId || !enabled || asked.current.has(roomId)) return
    asked.current.add(roomId)
    const now = new Date().toISOString()
    const fromDevice = () => {
      // Script 23 pas encore lancé : on se souvient sur cet appareil seulement
      let prev = null
      try {
        prev = localStorage.getItem(localKey(roomId))
        localStorage.setItem(localKey(roomId), now)
      } catch {
        // pas grave
      }
      return prev
    }
    supabase.rpc('touch_room_visit', { target_room: roomId }).then(({ data, error }) => {
      const prev = error ? fromDevice() : typeof data === 'string' ? data : null
      setSeen((m) => new Map(m).set(roomId, prev))
    })
  }, [roomId, enabled])

  // « Vu » : les nouveautés disparaissent jusqu'à la prochaine fois
  function clear() {
    const now = new Date().toISOString()
    setSeen((m) => new Map(m).set(roomId, now))
  }

  return { since: enabled && roomId ? seen.get(roomId) ?? null : null, clear }
}
