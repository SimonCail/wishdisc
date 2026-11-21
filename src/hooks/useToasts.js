import { useCallback, useState } from 'react'

// toast(message, type, { action: { label, onClick }, duration })
// action : un bouton dans le message (ex. « Annuler »), qui ferme le message une fois touché
export function useToasts() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'success', opts = {}) => {
    const id = `${Date.now()}-${Math.random()}`
    const duration = opts.duration ?? 3000
    setToasts((prev) => [...prev, { id, message, type, action: opts.action ?? null, duration }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return { toasts, toast, dismiss }
}
