import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import AvatarCropper from './AvatarCropper'
import ArtistAvatarPicker from './ArtistAvatarPicker'
import SpinningDisc from './SpinningDisc'
import { ThemeSettings, SoundSetting } from './ThemePicker'
import { LANGS, currentLang, setLang } from '../lib/i18n'
import { pushAvailability } from '../lib/push'
import { CloseIcon, CheckIcon } from './Icons'
import { loadPhoto, exportAvatar } from '../lib/avatar'
import PushSettings from './PushSettings'
import { t, tn } from '../lib/i18n'

// Couleurs proposées pour l'avatar (celles du site)
const COLORS = ['#ec5b3e', '#e58a4e', '#f1c04e', '#b9cf5a', '#6fbf98', '#6aa6d6', '#f09aaa']

const field =
  'mt-1.5 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-paper outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
const primaryBtn =
  'rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-accent-soft disabled:opacity-50'
const ghostBtn =
  'rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-accent hover:bg-raised disabled:opacity-50'

function CameraIcon(p) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

// Petites icônes des rubriques
const I = {
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  disc: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></>,
  look: <><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15.5 15H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="8" r="1" /></>,
  lang: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  import: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
}
function RowIcon({ name }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-paper">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {I[name]}
      </svg>
    </span>
  )
}
const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-muted">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

// Choix de la langue du site
function LanguageSettings() {
  const current = currentLang()
  return (
    <div role="radiogroup" aria-label={t('Langue')} className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {LANGS.map((l) => (
        <button
          key={l.code}
          role="radio"
          aria-checked={current === l.code}
          onClick={() => current !== l.code && setLang(l.code)}
          className="flex w-full items-center gap-3 bg-surface px-4 py-3.5 text-left transition hover:bg-raised"
        >
          <span className="w-7 font-mono text-xs uppercase text-muted">{l.code}</span>
          <span className={`flex-1 ${current === l.code ? 'font-bold' : ''}`}>{l.name}</span>
          {current === l.code && <CheckIcon width={18} height={18} className="text-accent" />}
        </button>
      ))}
    </div>
  )
}

const DISCOGS_IMAGE = /^https:\/\/i\.discogs\.com\//
const norm = (tx = '') => tx.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Choix du disque qui tourne sur la platine en haut de la page
function TurntableSettings({ value, myDiscs, onChange, offline }) {
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(null) // clé en cours d'enregistrement
  const [error, setError] = useState(null)
    // Un disque choisi qui n'est plus dans la collection compte comme « Classique »
  const stale = value?.mode === 'disc' && !myDiscs.some((d) => d.key === value.key)
  const mode = stale ? 'classic' : value?.mode ?? 'classic'

  const discs = useMemo(() => {
    const q = norm(filter.trim())
    return myDiscs
      .filter((d) => d.cover_url && DISCOGS_IMAGE.test(d.cover_url))
      .filter((d) => !q || norm(`${d.title} ${d.artist}`).includes(q))
      .slice(0, 60)
  }, [myDiscs, filter])

  async function choose(next, key) {
    setBusy(key)
    setError(null)
    const err = await onChange(next)
    setBusy(null)
    if (err) setError(err)
  }

  const preview =
    mode === 'disc' ? value.cover_url : mode === 'random' ? myDiscs.find((d) => d.cover_url)?.cover_url : null
  const label =
    mode === 'disc' ? `${value.title}${value.artist ? ` — ${value.artist}` : ''}`
    : mode === 'random' ? t('Un disque de ta collection, différent à chaque visite')
    : t('L’étiquette corail d’origine')

  const option = (active) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition disabled:opacity-50 ${
      active ? 'border-accent bg-accent font-bold text-ink' : 'border-line text-muted hover:border-accent hover:text-paper'
    }`

  return (
    <div>
      <div className="flex items-center gap-4">
        <SpinningDisc cover={preview} className="h-20 w-20 shrink-0" spin="animate-slow-spin" />
        <div className="min-w-0">
          <p className="font-display text-lg font-black uppercase leading-tight">
            {mode === 'disc' ? t('Ton disque') : mode === 'random' ? t('Au hasard') : t('Classique')}
          </p>
          <p className="truncate text-sm text-muted">{label}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t('Disque de la platine')}>
        <button role="radio" aria-checked={mode === 'classic'} disabled={offline || !!busy} onClick={() => choose(null, 'classic')} className={option(mode === 'classic')}>{t('Classique')}</button>
        <button role="radio" aria-checked={mode === 'random'} disabled={offline || !!busy || !myDiscs.some((d) => d.cover_url)} onClick={() => choose({ mode: 'random' }, 'random')} className={option(mode === 'random')}>{t('Au hasard')}</button>
      </div>

      {myDiscs.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted">{t('Ou choisis un disque de ta collection')}</p>
            {myDiscs.length > 12 && (
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('Filtrer…')}
                aria-label={t('Filtrer mes disques')}
                className="w-36 rounded-full border border-line bg-ink px-3 py-1 text-sm outline-none focus:border-accent"
              />
            )}
          </div>
          <ul className="nice-scroll mt-2 grid max-h-56 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
            {discs.map((d) => {
              const active = mode === 'disc' && value.key === d.key
              return (
                <li key={d.key}>
                  <button
                    onClick={() =>
                      choose({ mode: 'disc', key: d.key, cover_url: d.cover_url, title: d.title.slice(0, 200), artist: (d.artist || '').slice(0, 200) }, d.key)
                    }
                    disabled={offline || !!busy}
                    aria-pressed={active}
                    aria-label={`${d.title} — ${d.artist}`}
                    title={`${d.title} — ${d.artist}`}
                    className={`relative block aspect-square w-full overflow-hidden rounded-md transition hover:scale-105 disabled:cursor-wait ${
                      active ? 'ring-4 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-black/10'
                    } ${busy === d.key ? 'animate-shimmer' : ''}`}
                  >
                    <img src={d.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center bg-accent/50 text-ink">
                        <CheckIcon width={20} height={20} />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            {discs.length === 0 && <li className="col-span-full py-4 text-center text-sm text-muted">{t('Aucun disque avec pochette ne correspond.')}</li>}
          </ul>
        </div>
      )}
      {myDiscs.length === 0 && (
        <p className="mt-4 text-sm text-muted">{t('Ajoute des disques à ta collection (« Je l’ai ») pour pouvoir les poser sur la platine.')}</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function Section({ title, children, aside }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

// Petit formulaire qui s'ouvre sur place (email, mot de passe)
function Expandable({ label, value, open, onToggle, children }) {
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-sm text-muted">{value}</p>
        </div>
        <button onClick={onToggle} className="shrink-0 text-sm font-medium text-accent hover:underline">
          {open ? t('Annuler') : t('Modifier')}
        </button>
      </div>
      {open && <div className="animate-pop mt-3">{children}</div>}
    </div>
  )
}

export default function ProfilePanel({
  me, email, myCounts, rooms, myArtists, myDiscs = [], offline, onSetTurntable,
  onSaveProfile, onSetPhoto, onSetArtist, onRemovePhoto, onChangeEmail, onChangePassword,
  onLogout, onImport, onDeleteAccount, onClose, onToast, onReplayTour,
}) {
  const [name, setName] = useState(me.name)
  const [color, setColor] = useState(me.color)
  const [saving, setSaving] = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [photo, setPhoto] = useState(null) // photo choisie, en cours de recadrage
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const fileRef = useRef(null)
  const [artistOpen, setArtistOpen] = useState(false)
  const [artistBusy, setArtistBusy] = useState(false)
  const [artistError, setArtistError] = useState(null)

  const scrollRef = useRef(null)
  // Rubrique ouverte : null = la liste des rubriques
  const [page, setPage] = useState(null)
  const [open, setOpen] = useState(null) // 'email' | 'password' | 'delete'
  const [newEmail, setNewEmail] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formInfo, setFormInfo] = useState(null)
  const [deleteWord, setDeleteWord] = useState('')

  // Fermeture avec Échap (sauf pendant un envoi)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || photo || artistOpen || photoBusy || busy) return
      if (page) setPage(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, photo, artistOpen, photoBusy, busy, page])

  function openPage(name) {
    setPage(name)
    setOpen(null)
    setFormError(null)
    setFormInfo(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }


  // Libère l'aperçu local quand il n'est plus utile
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])

  function toggle(section) {
    setOpen((o) => (o === section ? null : section))
    setFormError(null)
    setFormInfo(null)
    setCurrentPw('')
    setNewPw('')
    setNewEmail('')
    setDeleteWord('')
  }

  // --- Photo ---
  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // pour pouvoir rechoisir la même photo
    if (!file) return
    setPhotoError(null)
    try {
      setPhoto(await loadPhoto(file))
    } catch (err) {
      setPhotoError(err.message)
    }
  }

  // Cadrage validé dans l'éditeur : on produit la photo finale puis on l'envoie
  async function confirmPhoto(view) {
    setPhotoBusy(true)
    setPhotoError(null)
    let err
    try {
      err = await onSetPhoto(await exportAvatar(photo, view))
    } catch (e) {
      err = e.message
    }
    setPhotoBusy(false)
    if (err) setPhotoError(err)
    else {
      setPhoto(null)
      onToast(t('Nouvelle photo enregistrée'))
    }
  }

  function cancelPhoto() {
    setPhoto(null)
    setPhotoError(null)
  }

  // Avatar d'artiste choisi dans la grille
  async function confirmArtist(choice) {
    setArtistBusy(true)
    setArtistError(null)
    const err = await onSetArtist(choice)
    setArtistBusy(false)
    if (err) setArtistError(err)
    else {
      setArtistOpen(false)
      onToast(t('Avatar : {label}', { label: choice.label }))
    }
  }

  async function removePhoto() {
    setPhotoBusy(true)
    const err = await onRemovePhoto()
    setPhotoBusy(false)
    if (err) setPhotoError(err)
    else onToast(t('Avatar retiré'))
  }

  // --- Prénom & couleur ---
  const dirty = name.trim() !== me.name || color !== me.color
  async function saveProfile(e) {
    e.preventDefault()
    if (!name.trim()) return setProfileError(t('Ton prénom ne peut pas être vide.'))
    setSaving(true)
    setProfileError(null)
    const err = await onSaveProfile({ name: name.trim(), color })
    setSaving(false)
    if (err) setProfileError(err)
    else onToast(t('Profil enregistré'))
  }

  // --- Email / mot de passe / suppression ---
  async function run(action) {
    setBusy(true)
    setFormError(null)
    setFormInfo(null)
    await action()
    setBusy(false)
  }

  const submitEmail = (e) => {
    e.preventDefault()
    run(async () => {
      const res = await onChangeEmail(newEmail)
      if (res.error) setFormError(res.error)
      else setFormInfo(res.info)
    })
  }

  const submitPassword = (e) => {
    e.preventDefault()
    run(async () => {
      const err = await onChangePassword(currentPw, newPw)
      if (err) setFormError(err)
      else {
        toggle('password')
        onToast(t('Mot de passe modifié'))
      }
    })
  }

  const submitDelete = (e) => {
    e.preventDefault()
    run(async () => {
      const err = await onDeleteAccount()
      if (err) setFormError(err)
    })
  }

  // Ce qu'on affiche dans le grand avatar : l'aperçu en attente, sinon le profil
  const shown = {
    ...me,
    name: name.trim() || me.name,
    color,
  }

  // Les rubriques des réglages
  const pushState = pushAvailability()
  const pages = [
    { id: 'profile', icon: 'profile', title: t('Profil'), hint: t('Prénom, couleur') },
    { id: 'turntable', icon: 'disc', title: t('Platine'), hint: me.turntable?.mode === 'disc' ? me.turntable.title : me.turntable?.mode === 'random' ? t('Au hasard') : t('Classique') },
    { id: 'look', icon: 'look', title: t('Apparence'), hint: t('Jour, nuit') },
    { id: 'lang', icon: 'lang', title: t('Langue'), hint: LANGS.find((l) => l.code === currentLang())?.name },
    { id: 'notifications', icon: 'bell', title: t('Notifications'), hint: pushState === 'ok' ? t('Sur ce téléphone') : t('Pas disponibles ici') },
    { id: 'discogs', icon: 'import', title: t('Discogs'), hint: t('Importer ta collection') },
    { id: 'account', icon: 'lock', title: t('Compte'), hint: t('Email, mot de passe, suppression') },
  ]
  const current = pages.find((x) => x.id === page)

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !photo && !artistOpen && !photoBusy && !busy && onClose()}
    >
      <div
        ref={scrollRef}
        role="dialog"
        aria-modal="true"
        aria-label={current ? current.title : t('Mon profil')}
        className="animate-pop nice-scroll max-h-[94vh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl bg-ink shadow-2xl shadow-black/60 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!current ? (
          <>
        {/* En-tête : grande pochette verte avec le disque à ta couleur */}
        <header className="relative overflow-hidden bg-accent px-6 pb-7 pt-5 text-ink sm:px-8">
          <div
            aria-hidden="true"
            className="vinyl-disc animate-disc pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 opacity-40 sm:opacity-100"
            style={{ '--disc-label': color }}
          />
          <div className="relative flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">{t('Mon profil')}</span>
            <button
              onClick={onClose}
              aria-label={t('Fermer')}
              className="rounded-full p-1.5 text-ink/80 transition hover:bg-ink/15 hover:text-ink"
            >
              <CloseIcon width={20} height={20} />
            </button>
          </div>

          <div className="relative mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              {/* Toute la photo est cliquable pour en choisir une nouvelle */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={offline || photoBusy}
                aria-label={t('Changer la photo')}
                title={t('Changer la photo')}
                className="group relative block rounded-full transition hover:scale-[1.03] disabled:opacity-60"
              >
                <Avatar
                  member={shown}
                  size={136}
                  ring={false}
                  className="block ring-4 ring-ink shadow-xl shadow-black/30"
                />
                <span className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-sun text-paper shadow-lg ring-4 ring-accent transition group-hover:scale-110">
                  <CameraIcon />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickPhoto}
                aria-label={t('Choisir une photo dans la galerie')}
              />
            </div>

            <div className="min-w-0 pb-1">
              <h2 className="font-display break-words text-5xl font-black uppercase leading-[0.85] sm:text-6xl">
                {name.trim() || me.name}
              </h2>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/75">
                {tn(myCounts.wish, '{n} souhait', '{n} souhaits')} · {t('{n} en collection', { n: myCounts.owned })} ·{' '}
                {tn(rooms.length, '{n} salon', '{n} salons')}
              </p>
              {me.avatar_label && (
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/75">{t('Avatar · {avatar_label}', { avatar_label: me.avatar_label })}</p>
              )}
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button
                onClick={() => {
                  setArtistError(null)
                  setArtistOpen(true)
                }}
                disabled={offline || photoBusy}
                className="font-medium underline-offset-4 hover:underline disabled:opacity-60"
              >
                {me.avatar_url ? t('Changer d’artiste') : t('Choisir un artiste')}
              </button>
              {(me.avatar_path || me.avatar_url) && (
                <button
                  onClick={removePhoto}
                  disabled={offline || photoBusy}
                  className="text-ink/70 underline-offset-4 hover:text-ink hover:underline disabled:opacity-60"
                >
                  {photoBusy ? '…' : me.avatar_url ? t('Retirer l’artiste') : t('Retirer la photo')}
                </button>
              )}
            </div>
          {photoError && !photo && (
            <p className="relative mt-3 rounded-xl bg-ink px-3 py-2 text-sm text-red-600">{photoError}</p>
          )}
        </header>

            <div className="space-y-4 p-4 sm:p-6">
              {offline && (
                <p className="rounded-2xl bg-raised px-4 py-3 text-sm text-muted">{t('Hors-ligne : les modifications du profil sont désactivées.')}</p>
              )}

              {/* La liste des rubriques : chacune s'ouvre sur sa propre page */}
              <nav aria-label={t('Réglages')} className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {pages.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => openPage(x.id)}
                    className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-raised"
                  >
                    <RowIcon name={x.icon} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{x.title}</span>
                      <span className="block truncate text-sm text-muted">{x.hint}</span>
                    </span>
                    <Chevron />
                  </button>
                ))}
              </nav>

              <div className="flex flex-wrap items-center gap-2 px-1 pb-2 pt-1">
                <button onClick={onLogout} className={ghostBtn}>{t('Se déconnecter')}</button>
                {onReplayTour && (
                  <button onClick={onReplayTour} className={ghostBtn}>{t('Revoir la visite')}</button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Une rubrique : en-tête court avec retour */}
            <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-ink/95 px-3 py-3 backdrop-blur">
              <button
                onClick={() => setPage(null)}
                className="flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-bold text-muted transition hover:bg-raised hover:text-paper"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>{t('Réglages')}</button>
              <h2 className="min-w-0 flex-1 truncate text-center font-display text-lg font-black uppercase">{current.title}</h2>
              <button onClick={onClose} aria-label={t('Fermer')} className="rounded-full p-2 text-muted transition hover:bg-raised hover:text-paper">
                <CloseIcon width={20} height={20} />
              </button>
            </header>

            <div className="page-in p-4 sm:p-6">
              {offline && page !== 'look' && page !== 'lang' && (
                <p className="mb-4 rounded-2xl bg-raised px-4 py-3 text-sm text-muted">{t('Hors-ligne : les modifications sont désactivées.')}</p>
              )}

              {page === 'profile' && (
                <Section title={t('Ton profil')}>
            <form onSubmit={saveProfile}>
              <label className="block text-xs font-medium text-muted">{t('Prénom')}<input
                  className={field}
                  value={name}
                  maxLength={30}
                  disabled={offline}
                  autoComplete="given-name"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-muted">{t('Ta couleur')}</legend>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      disabled={offline}
                      aria-label={t('Couleur {c}', { c })}
                      aria-pressed={color === c}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-paper transition hover:scale-110 ${
                        color === c ? 'ring-2 ring-paper ring-offset-2 ring-offset-surface' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <CheckIcon width={16} height={16} />}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">{t('Elle te repère dans les salons, et remplace la photo si tu n\'en as pas.')}</p>
              </fieldset>

              {profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}
              <div className="mt-5 flex items-center gap-3">
                <button disabled={!dirty || saving || offline} className={primaryBtn}>
                  {saving ? '…' : t('Enregistrer')}
                </button>
                {dirty && !saving && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(me.name)
                      setColor(me.color)
                    }}
                    className="text-sm text-muted hover:text-paper"
                  >{t('Annuler')}</button>
                )}
              </div>
            </form>
                </Section>
              )}

              {page === 'turntable' && (
                <div className="space-y-4">
                  <Section title={t('Le disque sur la platine')}>
            <TurntableSettings
              value={me.turntable}
              myDiscs={myDiscs}
              onChange={async (next) => {
                const err = await onSetTurntable(next)
                if (!err) onToast(next?.mode === 'disc' ? t('Sur la platine : {title}', { title: next.title }) : next?.mode === 'random' ? t('Platine : au hasard') : t('Platine : classique'))
                return err
              }}
              offline={offline}
            />
                  </Section>
                  <SoundSetting className="" />
                </div>
              )}

              {page === 'look' && (
                <Section title={t('Jour ou nuit')}>
                  <ThemeSettings withSound={false} />
                </Section>
              )}

              {page === 'lang' && (
                <div>
                  <LanguageSettings />
                  <p className="mt-3 px-1 text-sm text-muted">{t('L’app se recharge dans la langue choisie. Ce réglage est gardé sur cet appareil.')}</p>
                </div>
              )}

              {page === 'notifications' && (
                <Section title={t('Notifications')}>
                  <PushSettings onToast={onToast} />
                </Section>
              )}

              {page === 'discogs' && (
                <Section title={t('Discogs')}>
                  <p className="text-sm text-muted">{t('Ramène ta collection et ta wantlist Discogs dans ta liste, en une fois.')}</p>
                  <button onClick={onImport} disabled={offline} className={`${primaryBtn} mt-4`}>{t('Importer')}</button>
                </Section>
              )}

              {page === 'account' && (
                <div className="space-y-4">
                  <Section title={t('Connexion')}>
            <Expandable label={t('Email')} value={email} open={open === 'email'} onToggle={() => toggle('email')}>
              {formInfo ? (
                <p className="rounded-2xl bg-accent/10 p-4 text-sm leading-relaxed text-accent">{formInfo}</p>
              ) : (
                <form onSubmit={submitEmail} className="space-y-3">
                  <label className="block text-xs font-medium text-muted">{t('Nouvel email')}<input type="email" autoComplete="email" className={field} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={'toi@exemple.fr'} disabled={offline} />
                  </label>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <button disabled={busy || !newEmail.trim() || offline} className={primaryBtn}>
                    {busy ? '…' : t('Recevoir le lien de confirmation')}
                  </button>
                </form>
              )}
            </Expandable>

            <Expandable label={t('Mot de passe')} value="••••••••" open={open === 'password'} onToggle={() => toggle('password')}>
              <form onSubmit={submitPassword} className="space-y-3">
                <label className="block text-xs font-medium text-muted">{t('Mot de passe actuel')}<input type="password" autoComplete="current-password" className={field} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} disabled={offline} />
                </label>
                <label className="block text-xs font-medium text-muted">{t('Nouveau mot de passe')}<input type="password" autoComplete="new-password" minLength={6} className={field} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={t('6 caractères minimum')} disabled={offline} />
                </label>
                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <button disabled={busy || !currentPw || newPw.length < 6 || offline} className={primaryBtn}>
                  {busy ? '…' : t('Changer le mot de passe')}
                </button>
              </form>
            </Expandable>
                  </Section>
                  {open !== 'delete' && (
                    <button onClick={() => toggle('delete')} className="px-1 text-left text-sm text-muted underline-offset-4 hover:text-red-600 hover:underline">{t('Supprimer mon compte')}</button>
                  )}
          {open === 'delete' && (
            <form onSubmit={submitDelete} className="animate-pop rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
              <p className="font-display text-xl font-black uppercase leading-tight">{t('Supprimer ton compte ?')}</p>
              <p className="mt-2 text-sm text-muted">{t('Tes souhaits, ta collection, ta photo et ta place dans tes salons seront effacés définitivement. Les autres membres gardent leurs listes.')}</p>
              <label className="mt-4 block text-xs font-medium text-muted">{t('Tape')} <span className="font-mono font-bold text-paper">{t('SUPPRIMER')}</span> {t('pour confirmer')}<input className={field} value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} autoComplete="off" disabled={offline} />
              </label>
              {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => toggle('delete')} className={ghostBtn}>{t('Annuler')}</button>
                <button
                  disabled={busy || deleteWord.trim().toUpperCase() !== t('SUPPRIMER').toUpperCase() || offline}
                  className="rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                >
                  {busy ? '…' : t('Supprimer définitivement')}
                </button>
              </div>
            </form>
          )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {artistOpen && (
        <ArtistAvatarPicker
          myArtists={myArtists}
          currentUrl={me.avatar_url}
          busy={artistBusy}
          error={artistError}
          onConfirm={confirmArtist}
          onCancel={() => setArtistOpen(false)}
        />
      )}
      {photo && (
        <AvatarCropper
          photo={photo}
          busy={photoBusy}
          error={photoError}
          onConfirm={confirmPhoto}
          onCancel={cancelPhoto}
        />
      )}
    </div>
  )
}
