import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://erhudovlvqynpkmtgsef.supabase.co'
const supabaseAnonKey = 'sb_publishable_vR1WnHVHYOGklkoHAVPzvg_upyke-kS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)