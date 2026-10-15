// Small gacha icons, drawn with the current text color (currentColor).

// Capsule: a pill split in two halves, the top half solid.
export function CapsuleIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12a6 6 0 0 1 12 0z" fill="currentColor" />
      <path d="M6 12h12a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

// Ticket: a rectangle with a notch on each side.
export function TicketIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      <path d="M15 8v8" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
    </svg>
  );
}
