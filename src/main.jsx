import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, getTheme } from './themes.js'
import { loadThemeCache, loadReduceMotion, applyReduceMotion, loadLang, applyLang, devThemeOverride } from './lib/settings.js'
import { isHwTestPath } from './handwriting/config.js'
import HwTestRoot from './handwriting/HwTestRoot.jsx'

// Before the first screen draws: the theme saved on this device (a copy of the account's theme,
// so it doesn't flash Midnight first; App applies the account's theme once gacha_status arrives)
// the カードの動きを減らす switch and the language (言語 / Language). In development only, ?theme=pizza in
// the URL tries a theme.
let storage = null
try { storage = window.localStorage } catch { /* blocked site data */ }
applyTheme(getTheme(devThemeOverride() || loadThemeCache(storage)))
applyReduceMotion(loadReduceMotion(storage))
applyLang(loadLang(storage))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* /hw-test: hidden handwriting test page */}
    {isHwTestPath(location.pathname) ? <HwTestRoot /> : <App />}
  </StrictMode>,
)
