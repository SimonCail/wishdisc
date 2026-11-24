import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initI18n } from './lib/i18n'

// La langue est chargée AVANT le reste de l'app : les textes fixes des fichiers
// (noms des envies, des couleurs…) sont ainsi déjà traduits quand ils se créent.
initI18n()
  .then(() => import('./App.jsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
