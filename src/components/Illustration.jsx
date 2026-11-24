// Petits dessins pour les écrans vides, dans les couleurs de l'app (jour et nuit)
// kind : 'crate' (souhaits vides), 'shelf' (collection vide), 'friends', 'room', 'offline', 'search'

const Disc = ({ cx, cy, r, label = 'fill-sun' }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} className="fill-[#1b2420]" />
    <circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke="#33413a" strokeWidth="1.5" />
    <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke="#33413a" strokeWidth="1.2" />
    <circle cx={cx} cy={cy} r={r * 0.34} className={label} />
    <circle cx={cx} cy={cy} r={r * 0.07} className="fill-[#f5f1e8]" />
  </g>
)

const Sparks = ({ x, y }) => (
  <path
    d={`M${x} ${y + 10} l6 -6 M${x + 10} ${y + 24} l9 -2 M${x - 4} ${y} l1 -8`}
    className="stroke-coral"
    strokeWidth="3"
    strokeLinecap="round"
  />
)

const Crate = ({ x = 30, y = 70, w = 96 }) => (
  <g>
    <path d={`M${x} ${y} h${w} v62 a4 4 0 0 1 -4 4 h${-(w - 8)} a4 4 0 0 1 -4 -4z`} fill="#c98b4f" />
    <path d={`M${x} ${y} h${w} v14 h${-w}z`} fill="#b07640" />
    <path d={`M${x + 14} ${y + 22} h${w - 28} M${x + 14} ${y + 34} h${w - 28} M${x + 14} ${y + 46} h${w - 28}`} stroke="#b07640" strokeWidth="3" strokeLinecap="round" />
  </g>
)

const Person = ({ x, y, color }) => (
  <g>
    <circle cx={x} cy={y} r="15" fill={color} />
    <path d={`M${x - 24} ${y + 50} a24 24 0 0 1 48 0z`} fill={color} />
  </g>
)

export default function Illustration({ kind = 'crate', className = '' }) {
  return (
    <svg viewBox="0 0 190 150" width="190" height="150" aria-hidden="true" className={`mx-auto ${className}`}>
      <ellipse cx="95" cy="140" rx="80" ry="7" className="fill-line" />
      {kind === 'crate' && (
        <>
          <Disc cx={118} cy={62} r={46} />
          <Crate />
          <Sparks x={150} y={12} />
        </>
      )}
      {kind === 'shelf' && (
        <>
          <rect x="22" y="118" width="146" height="10" rx="3" fill="#b07640" />
          <rect x="32" y="52" width="14" height="66" rx="2" className="fill-accent" />
          <rect x="48" y="60" width="12" height="58" rx="2" className="fill-sun" />
          <rect x="62" y="48" width="14" height="70" rx="2" className="fill-coral" />
          <rect x="88" y="70" width="48" height="48" rx="3" transform="rotate(-14 112 94)" fill="#7a45c4" />
          <Disc cx={146} cy={96} r={22} label="fill-coral" />
          <Sparks x={150} y={34} />
        </>
      )}
      {kind === 'friends' && (
        <>
          <Person x={62} y={72} color="#f09aaa" />
          <Person x={128} y={72} color="#f1c04e" />
          <Disc cx={95} cy={52} r={20} />
          <Sparks x={140} y={16} />
        </>
      )}
      {kind === 'room' && (
        <>
          <path d="M40 132 V70 l55 -38 l55 38 v62z" className="fill-accent" />
          <rect x="80" y="92" width="30" height="40" rx="3" fill="#b07640" />
          <Disc cx={95} cy={64} r={16} />
          <Sparks x={150} y={18} />
        </>
      )}
      {kind === 'offline' && (
        <>
          <path d="M52 108 a26 26 0 0 1 6 -51 a34 34 0 0 1 64 -6 a28 28 0 0 1 16 57z" className="fill-line" />
          <path d="M70 120 l50 -64" className="stroke-coral" strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {kind === 'search' && (
        <>
          <Crate x={22} y={74} w={90} />
          <circle cx="128" cy="62" r="26" fill="none" className="stroke-accent" strokeWidth="8" />
          <path d="M146 82 l20 22" className="stroke-accent" strokeWidth="10" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
