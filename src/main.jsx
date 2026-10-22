import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, getTheme } from './themes.js'
import { isHwTestPath } from './handwriting/config.js'
import HwTestRoot from './handwriting/HwTestRoot.jsx'

// TEMPORARY until the theme unlock feature exists: in development only (npm run dev),
// ?theme=pizza or ?theme=lagoon in the URL tries another theme. The live site always
// uses the default theme.
const themeId = import.meta.env.DEV ? new URLSearchParams(location.search).get('theme') : null
applyTheme(getTheme(themeId))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* /hw-test: hidden handwriting test page */}
    {isHwTestPath(location.pathname) ? <HwTestRoot /> : <App />}
  </StrictMode>,
)
