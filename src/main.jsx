import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, getTheme } from './themes.js'

// TEMPORARY until the theme unlock feature exists: in development only (npm run dev),
// ?theme=pizza or ?theme=lagoon in the URL tries another theme. The live site always
// uses the default theme.
const themeId = import.meta.env.DEV ? new URLSearchParams(location.search).get('theme') : null
applyTheme(getTheme(themeId))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
