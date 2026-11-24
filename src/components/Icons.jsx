const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const CloseIcon = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)
export const CheckIcon = (p) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const TrashIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
)
export const NoteIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)
export const ArrowIcon = (p) => (
  <svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>
)
// Ranger dans la collection (flèche qui descend dans un bac)
export const ShelveIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14" /></svg>
)
export const StarIcon = ({ filled, ...p }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
)
export const GiftIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M12 8v13M3 12h18M12 8c-1.5-3.5-6-4-6-1.5S10 8 12 8zM12 8c1.5-3.5 6-4 6-1.5S14 8 12 8z" />
  </svg>
)
export const ShareIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)
export const CopyIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
)
export const ChevronIcon = (p) => (
  <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
)

// Vue « liste » (cartes) et vue « mur » (pochettes serrées)
export const CardsIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <path d="M4 15h7M4 19h5M13 15h7M13 19h5" />
  </svg>
)
export const WallIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="5" height="5" rx="0.8" />
    <rect x="9.5" y="3.5" width="5" height="5" rx="0.8" />
    <rect x="15.5" y="3.5" width="5" height="5" rx="0.8" />
    <rect x="3.5" y="9.5" width="5" height="5" rx="0.8" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
    <rect x="15.5" y="9.5" width="5" height="5" rx="0.8" />
    <rect x="3.5" y="15.5" width="5" height="5" rx="0.8" />
    <rect x="9.5" y="15.5" width="5" height="5" rx="0.8" />
    <rect x="15.5" y="15.5" width="5" height="5" rx="0.8" />
  </svg>
)
// Fouiller le bac : des pochettes en perspective
export const CrateIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4h10l1.5 6h-13z" />
    <path d="M5.5 10h13" />
    <path d="M3 13h18v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z" />
    <path d="M9 16.5h6" />
  </svg>
)

export const PinIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
)

// Un disque qui part vers quelqu'un (prêt)
export const LendIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="12" r="6" />
    <circle cx="9" cy="12" r="1.6" />
    <path d="M17 8.5 20.5 12 17 15.5" />
    <path d="M13.5 12h7" />
  </svg>
)

export const CalendarIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)