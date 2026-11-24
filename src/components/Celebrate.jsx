import { useEffect } from 'react'
import Cover from './Cover'
import { t } from '../lib/i18n'

// Petit son de platine : le saphir qui se pose (crépitement) puis deux notes douces
function playSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    // crépitement
    const len = Math.floor(ctx.sampleRate * 0.35)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.004 ? Math.random() * 2 - 1 : (Math.random() * 2 - 1) * 0.04) * (1 - i / len)
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const ng = ctx.createGain()
    ng.gain.value = 0.5
    noise.connect(ng).connect(ctx.destination)
    noise.start(now)
    // deux notes
    ;[
      [659.25, 0.18],
      [987.77, 0.34],
    ].forEach(([f, at]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0, now + at)
      g.gain.linearRampToValueAtTime(0.18, now + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.6)
      o.connect(g).connect(ctx.destination)
      o.start(now + at)
      o.stop(now + at + 0.65)
    })
    setTimeout(() => ctx.close?.(), 1500)
  } catch {
    // pas de son, tant pis
  }
}

const CONFETTI = [
  ['8%', '#f1c04e', 0], ['18%', '#ec5b3e', 0.1], ['28%', '#2b62c9', 0.25], ['40%', '#f09aaa', 0.05], ['52%', '#2f9a57', 0.2],
  ['63%', '#f1c04e', 0.12], ['74%', '#ec5b3e', 0.3], ['84%', '#6aa6d6', 0.08], ['92%', '#f09aaa', 0.22], ['34%', '#f1c04e', 0.35],
  ['58%', '#6aa6d6', 0.4], ['12%', '#2f9a57', 0.45], ['70%', '#f09aaa', 0.5], ['46%', '#ec5b3e', 0.55],
]

// « Souhait exaucé ! » : le vinyle sort de sa pochette, des confettis tombent.
// Disparaît tout seul après quelques secondes (ou d'un tap).
export default function Celebrate({ vinyl, count, sound, onDone }) {
  useEffect(() => {
    if (sound) playSound()
    const timer = setTimeout(onDone, 2600)
    const onKey = (e) => e.key === 'Escape' && onDone()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [onDone, sound])

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="celebrate-in fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-ink/85 backdrop-blur-sm"
    >
      {CONFETTI.map(([left, color, delay], i) => (
        <span
          key={i}
          aria-hidden="true"
          className="confetti absolute top-0 h-3 w-2 rounded-[2px]"
          style={{ left, background: color, animationDelay: `${delay}s`, '--spin': `${(i % 2 ? 1 : -1) * (200 + i * 40)}deg` }}
        />
      ))}

      <div className="relative h-48 w-64" aria-hidden="true">
        <div className="celebrate-disc vinyl-disc absolute left-6 top-2 h-44 w-44" style={{ '--disc-label': '#f1c04e' }} />
        <Cover url={vinyl.cover_url} className="absolute right-0 top-0 h-48 w-48 rounded-md shadow-[0_20px_40px_-14px_rgba(0,0,0,0.7)]" />
      </div>

      <p className="mt-8 text-center font-display text-4xl font-black uppercase leading-[0.9] text-paper">
        {t('Souhait')}
        <br />
        {t('exaucé !')}
      </p>
      <p className="mt-3 max-w-xs px-6 text-center text-sm text-paper/80">
        {count > 1
          ? t('« {title} » rejoint ta collection. C’est ton {n}e de l’année.', { title: vinyl.title, n: count })
          : t('« {title} » rejoint ta collection.', { title: vinyl.title })}
      </p>
    </div>
  )
}
