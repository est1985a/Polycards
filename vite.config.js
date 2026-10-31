import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // The short commit id Vercel builds from (null locally), sent with card reports
    // (src/lib/reportCapture.js) so a report can be matched to the app version.
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null),
  },
})
