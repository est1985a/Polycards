// Pop-up closing rule (ReviewPlanSheet.jsx): close on Escape, or on a tap on the dark backdrop
// itself (not on anything inside the box).
export function shouldCloseSheet(event) {
  if (event.type === 'keydown') return event.key === 'Escape';
  return event.target === event.currentTarget;
}
