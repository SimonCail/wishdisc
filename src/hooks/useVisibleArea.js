import { useEffect, useState } from 'react'

// La partie de l'écran vraiment visible (sur iPhone, le clavier en cache une partie)
export default function useVisibleArea() {
  const read = () => {
    const vv = window.visualViewport
    if (!vv || !vv.height) return { top: 0, height: window.innerHeight, keyboard: false }
    return { top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 }
  }
  const [area, setArea] = useState(read)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setArea(read())
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return area
}
