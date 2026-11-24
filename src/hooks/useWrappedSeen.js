import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Les Wrapped déjà ouverts : retenus sur le compte (script 25), pour que ce qui a été vu
// sur le téléphone ne soit plus « Nouveau » sur l'ordinateur.
// Copie sur l'appareil pour l'affichage immédiat et hors connexion.
const KEY = 'wishdisc-wrapped-seen'

function readLocal() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function writeLocal(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set].slice(-80)))
  } catch {
    // pas grave
  }
}

export default function useWrappedSeen(userId) {
  const [seen, setSeen] = useState(readLocal)

  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase
      .from('wrapped_seen')
      .select('period')
      .then(({ data, error }) => {
        if (!alive || error) return // script 25 pas lancé : on garde la copie locale
        const remote = new Set((data ?? []).map((r) => r.period))
        const local = readLocal()
        // Vus ici avant que le compte les retienne : on les envoie
        const toSend = [...local].filter((p) => !remote.has(p))
        if (toSend.length) supabase.from('wrapped_seen').upsert(toSend.map((period) => ({ user_id: userId, period })), { ignoreDuplicates: true }).then(() => {})
        const next = new Set([...local, ...remote])
        writeLocal(next)
        setSeen(next)
      })
    return () => {
      alive = false
    }
  }, [userId])

  const markSeen = useCallback(
    (period) => {
      setSeen((cur) => {
        if (cur.has(period)) return cur
        const next = new Set(cur).add(period)
        writeLocal(next)
        return next
      })
      if (userId) supabase.from('wrapped_seen').upsert({ user_id: userId, period }, { ignoreDuplicates: true }).then(() => {})
    },
    [userId],
  )

  return { seen, markSeen }
}
