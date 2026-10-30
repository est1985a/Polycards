// Ticket awards from teachers (supabase/polycards-teacher-phase2.sql). Pure functions.
// The database checks everything again (award_tickets()); these keep the forms friendly.

export const AWARD_MIN = 1;
export const AWARD_MAX = 10;
export const AWARD_MESSAGE_MAX = 60;

// The amount stepper: always a whole number from 1 to 10.
export function clampAmount(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return AWARD_MIN;
  return Math.min(AWARD_MAX, Math.max(AWARD_MIN, v));
}

// The message as saved: spaces tidied, '' → null (no message). Same rule as award_tickets().
export function cleanAwardMessage(text) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

// Characters, counted the way the database does (char_length), so emoji count as one.
export const messageLength = (text) => Array.from(String(text ?? '').replace(/\s+/g, ' ').trim()).length;

export const messageTooLong = (text) => messageLength(text) > AWARD_MESSAGE_MAX;

// Several unseen awards → one pop-up: the ids to mark seen, the total, each teacher once
// (in the order they gave), and every message with its teacher.
// rows: [{ id, teacher_name, amount, message, created_at }] from my_unseen_awards() (oldest first).
export function combineAwards(rows) {
  const list = rows || [];
  const teachers = [];
  for (const r of list) {
    const name = r.teacher_name || '';
    if (!teachers.includes(name)) teachers.push(name);
  }
  return {
    ids: list.map((r) => r.id),
    total: list.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    teachers,
    messages: list.filter((r) => r.message).map((r) => ({ id: r.id, teacher: r.teacher_name || '', text: r.message })),
  };
}
