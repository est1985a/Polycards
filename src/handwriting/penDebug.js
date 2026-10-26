// Pen debug overlay, for finding out why a box misses strokes on one iPad. Off unless the address
// has ?debugpen=1 (remembered for the tab in sessionStorage; ?debugpen=0 turns it off again).
// Teacher-only and technical, so the overlay is English only and never translated.
// Everything here does nothing when it is off. The overlay ignores taps (pointer-events: none),
// so it can never cover a box.
import { colors } from "../styles/theme.js";

const KEY = "polycards.debugPen";
let enabled = null;
let state = { cancels: 0 };
let panel = null;
const boxes = new Set(); // canvases of the boxes on screen

export function penDebugEnabled() {
  if (enabled !== null) return enabled;
  enabled = false;
  if (typeof window === "undefined") return enabled;
  let flag = null;
  try {
    flag = new URLSearchParams(window.location.search).get("debugpen");
  } catch {
    // no address to read
  }
  try {
    if (flag === "1") sessionStorage.setItem(KEY, "1");
    if (flag === "0") sessionStorage.removeItem(KEY);
    enabled = flag === "1" || (flag !== "0" && sessionStorage.getItem(KEY) === "1");
  } catch {
    enabled = flag === "1";
  }
  return enabled;
}

// "rect" = the box's position at the moment of the event; → x / y in CSS px and as a share of the box.
export function boxPosition(e, rect) {
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  return { x: Math.round(x), y: Math.round(y), fx: rect.width ? x / rect.width : 0, fy: rect.height ? y / rect.height : 0 };
}

// How long after the event happened it was handled (ms): large numbers mean the main thread was busy.
export function eventDelay(e) {
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  return typeof e.timeStamp === "number" && e.timeStamp > 0 && e.timeStamp <= now ? Math.round(now - e.timeStamp) : null;
}

const pct = (f) => `${Math.round(f * 100)}%`;

// The overlay's text lines (pure, for the tests).
export function penDebugLines(s, userAgent = "") {
  const lines = [];
  const d = s.down;
  lines.push(d
    ? `down: ${d.pointerType} x=${d.x} y=${d.y} (${pct(d.fx)} across, ${pct(d.fy)} down) ${d.accepted ? "ACCEPTED" : "REJECTED"}${d.reason ? ` - ${d.reason}` : ""}${d.delay != null ? `, ${d.delay} ms late` : ""}`
    : "down: none yet");
  lines.push(`pointercancel: ${s.cancels}${s.lastCancel ? ` (last: ${s.lastCancel})` : ""}`);
  if (s.lostCapture) lines.push(`lost capture: ${s.lostCapture}`);
  lines.push(`model: ${s.model ?? "not started"}${s.modelError ? ` - ${s.modelError}` : ""}${s.backend ? ` [${s.backend}]` : ""}${s.modelMs != null ? ` ${s.modelMs} ms` : ""}`);
  const r = s.recognition;
  lines.push(r ? `recognition: ${r.ms} ms - ${r.error ? `ERROR ${r.error}` : r.result}` : "recognition: none yet");
  lines.push(`ua: ${userAgent}`);
  return lines;
}

function render() {
  if (typeof document === "undefined") return;
  if (!panel) {
    panel = document.createElement("pre");
    panel.setAttribute("aria-hidden", "true");
    Object.assign(panel.style, {
      position: "fixed", left: "8px", bottom: "8px", zIndex: "1000", margin: "0", padding: "8px 10px",
      maxWidth: "min(560px, calc(100vw - 16px))", whiteSpace: "pre-wrap", wordBreak: "break-word",
      font: "11px/1.4 ui-monospace, Menlo, monospace", pointerEvents: "none", borderRadius: "8px",
      background: `color-mix(in srgb, ${colors.surface} 92%, transparent)`, color: colors.text, border: `1px solid ${colors.line}`,
    });
    document.body.appendChild(panel);
  }
  panel.textContent = penDebugLines(state, navigator.userAgent).join("\n");
}

// Adds to what the overlay shows.
export function penLog(patch) {
  if (!penDebugEnabled()) return;
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  render();
}

// A pen-down that lands on top of a box but reaches another element (something covering the box)
// never reaches the box, so the page itself watches for that.
function onDocumentDown(e) {
  for (const canvas of boxes) {
    if (e.target === canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
      const t = e.target;
      const name = t?.tagName ? `${t.tagName.toLowerCase()}${t.className && typeof t.className === "string" ? `.${t.className.split(" ").join(".")}` : ""}` : "?";
      penLog({ down: { pointerType: e.pointerType, ...boxPosition(e, rect), accepted: false, reason: `over the box but reached <${name}> instead`, delay: eventDelay(e) } });
      return;
    }
  }
}

// Each box's canvas registers itself while on screen. → unregister
export function registerBox(canvas) {
  if (!penDebugEnabled() || !canvas) return () => {};
  if (boxes.size === 0) document.addEventListener("pointerdown", onDocumentDown, true);
  boxes.add(canvas);
  render();
  return () => {
    boxes.delete(canvas);
    if (boxes.size === 0) document.removeEventListener("pointerdown", onDocumentDown, true);
  };
}
