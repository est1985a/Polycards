// set-test-password.mjs
// Changes the password of one Polycards test account (made by create-test-users.mjs).
//
// Usage (from the Polycards project folder):
//   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." node tools/set-test-password.mjs aiden newpassword
//
// Leave out the new password to get a random one instead:
//   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." node tools/set-test-password.mjs aiden
//
// The new password is printed in the terminal only. Don't paste it or the key into a chat.

import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'node:crypto'

const DOMAIN = 'polycards.test'
const url = process.env.SUPABASE_URL ?? 'https://erhudovlvqynpkmtgsef.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const makePassword = (len = 10) =>
  Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

if (!key || key.includes('...')) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. See usage at the top of this file.')
  process.exit(1)
}

const [usernameArg, passwordArg] = process.argv.slice(2)
if (!usernameArg) {
  console.error('Give a username, e.g.: node tools/set-test-password.mjs aiden newpassword')
  process.exit(1)
}

const username = usernameArg.trim().toLowerCase()
const email = username.includes('@') ? username : `${username}@${DOMAIN}`
const password = passwordArg ?? makePassword()

if (password.length < 6) {
  console.error('Password must be at least 6 characters.')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Find the user by email (pages through all users).
let user = null
for (let page = 1; !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
  if (error) {
    console.error(`Could not list users: ${error.message}`)
    process.exit(1)
  }
  user = data.users.find((u) => u.email === email)
  if (data.users.length < 200) break
}

if (!user) {
  console.error(`No account found for ${username} (${email}).`)
  process.exit(1)
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
if (error) {
  console.error(`✗ ${username}: ${error.message}`)
  process.exit(1)
}

console.log(`✓ ${username}'s password is now: ${password}`)
console.log('Remember to update ~/polycards-test-accounts.csv if you keep track there.')
