import { createClient } from '@supabase/supabase-js'
import { notifySessionLost, watchedFetch } from './sessionWatch'

// Also used for the public word-audio file URLs (src/lib/speech.js).
export const supabaseUrl = 'https://erhudovlvqynpkmtgsef.supabase.co'
const supabaseAnonKey = 'sb_publishable_vR1WnHVHYOGklkoHAVPzvg_upyke-kS'

// Every request goes through watchedFetch, so a 401 from the database (the sign-in was lost)
// tells App, which signs out on this device and shows the login screen (see sessionWatch.js).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: watchedFetch((...args) => fetch(...args), notifySessionLost) },
})
