// create-test-users.mjs
// Creates Polycards username/password test accounts in Supabase Auth.
//
// Usage (from the Polycards project folder, so @supabase/supabase-js is found):
//   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." node tools/create-test-users.mjs
// (replace sb_secret_... with your real secret key; the project URL is filled in below)
//
// Usernames become emails on a fake domain: "aiden" -> aiden@polycards.test
// Passwords are generated randomly and saved to ~/polycards-test-accounts.csv
// (in your home folder, outside the repo, so they can't be committed by accident).
//
// NEVER put the service role / secret key in the app, in a VITE_ variable,
// or in any file that gets committed. It bypasses all security rules.

import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'node:crypto'
import { writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DOMAIN = 'polycards.test'
const USERNAMES = [
  'aiden',
  'amaya',
  ...Array.from({ length: 10 }, (_, i) => `test${i + 1}`),
]
const OUT_FILE = join(homedir(), 'polycards-test-accounts.csv')

// No look-alike characters (no i, l, o, 0, 1) so passwords are easy to type on an iPad.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const makePassword = (len = 10) =>
  Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

// Same public project URL the app uses in src/lib/supabaseClient.js
const url = process.env.SUPABASE_URL ?? 'https://erhudovlvqynpkmtgsef.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!key || key.includes('YOUR-SECRET-KEY') || key.includes('...')) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. See usage at the top of this file.')
  process.exit(1)
}

if (existsSync(OUT_FILE)) {
  console.error(`${OUT_FILE} already exists. Move or rename it first so no passwords get overwritten.`)
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const rows = ['username,password,email']
let created = 0

for (const username of USERNAMES) {
  const email = `${username}@${DOMAIN}`
  const password = makePassword()

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no real inbox, so mark as confirmed now
    user_metadata: { username, test_account: true },
  })

  if (error) {
    console.log(`✗ ${username}: ${error.message}`)
    continue
  }

  rows.push(`${username},${password},${email}`)
  created++
  console.log(`✓ ${username}`)
}

if (created > 0) {
  writeFileSync(OUT_FILE, rows.join('\n') + '\n', { mode: 0o600 })
  console.log(`\nCreated ${created} account(s). Usernames and passwords saved to ${OUT_FILE}`)
} else {
  console.log('\nNo accounts were created.')
}
