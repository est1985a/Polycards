import { createClient } from '@supabase/supabase-js'

// Also used for the public word-audio file URLs (src/lib/speech.js).
export const supabaseUrl = 'https://erhudovlvqynpkmtgsef.supabase.co'
const supabaseAnonKey = 'sb_publishable_vR1WnHVHYOGklkoHAVPzvg_upyke-kS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)