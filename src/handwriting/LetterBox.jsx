import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { HW_COLORS, STROKE_RATIO } from "./config.js";
import { colors } from "../styles/theme.js";

// Border and background for a checked box.
const STATE_STYLE = {
  correct: { border: colors.accent, background: HW_COLORS.paper },
  lenient: { border: HW_COLORS.lenient, background: HW_COLORS.lenientBg },
  wrong: { border: colors.danger, background: HW_COLORS.paper },
  pass: { border: HW_COLORS.pass, background: HW_COLORS.passBg }, // letter practice: always green
};

// Draws one stroke (or a single segment, or a dot for one point): black, round caps and joins.
function drawStroke(ctx, stroke, lineWidth) {
  ctx.strokeStyle = HW_COLORS.ink;
  ctx.fillStyle = HW_COLORS.ink;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (stroke.length === 1) {
    ctx.beginPath();
    ctx.arc(stroke[0].x, stroke[0].y, lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0].x, stroke[0].y);
  for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
  ctx.stroke();
}

// One letter box: a canvas the student writes one letter in. Square (size × size) in the answer;
// letter practice passes a taller `height`, an `overlay` (the four lines, drawn on top and never on the
// canvas, so the model never sees them) and its own `inkWidth`.
// Only the Apple Pencil draws (pointerType "pen") unless allowAnyPointer is set (test page).
// A finger or mouse tap that doesn't draw selects the box instead (for 消す).
// The very first pen contact draws: no tap, focus or selection is needed first.
// locked: answered, so nothing draws (the ink stays for the result).
// onPenDown: a stroke is starting (before it draws). onStroke: the pen lifted.
// ref → { undo(), clear(), isEmpty(), getGray({ inkRatio }), getStrokes() }
export default function LetterBox({
  ref, size, height = size, inkWidth, overlay = null, state = null, selected = false, allowAnyPointer = false, locked = false,
  label, onStroke, onSelect, onPenDown,
}) {
  const canvasRef = useRef(null);
  const strokes = useRef([]); // each stroke: [{ x, y }] in CSS pixels
  const drawing = useRef(null); // { pointerId, stroke }

  const lineWidth = inkWidth ?? Math.max(2, size * STROKE_RATIO);

  // Draws all strokes from scratch (after undo / clear / resize).
  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paint(canvas, lineWidth);
  }

  // The on-screen canvas is transparent (only ink), so the box background and the four lines show
  // through it. paper: fill it white first (the copies the model reads).
  function paint(canvas, width, paper = false) {
    const ctx = canvas.getContext("2d");
    const dpr = canvas.width / size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, height);
    if (paper) {
      ctx.fillStyle = HW_COLORS.paper;
      ctx.fillRect(0, 0, size, height);
    }
    for (const stroke of strokes.current) drawStroke(ctx, stroke, width);
  }

  // Size the canvas at the device pixel ratio so strokes are sharp.
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(height * dpr);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, height]);

  useImperativeHandle(ref, () => ({
    undo() {
      strokes.current.pop();
      redraw();
    },
    clear() {
      strokes.current = [];
      redraw();
    },
    isEmpty() {
      return strokes.current.length === 0;
    },
    // Grayscale pixels of the box (red channel; white paper, black ink) at the canvas's real
    // pixel size, which is what preprocessLetter is given. The ink is copied onto white paper off
    // screen (the canvas itself is transparent), so the lines and tints never reach the model.
    // inkRatio (letter practice): the strokes are drawn again with an ink width of this fraction of
    // the letter's own size, so the model sees the usual stroke thickness.
    getGray({ inkRatio } = {}) {
      const source = canvasRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      if (inkRatio) {
        const points = strokes.current.flat();
        const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
        const extent = points.length ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) : 0;
        paint(canvas, Math.max(1.5, extent * inkRatio), true);
      } else {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = HW_COLORS.paper;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0);
      }
      const { width, height: h } = canvas;
      const { data } = canvas.getContext("2d").getImageData(0, 0, width, h);
      const gray = new Uint8Array(width * h);
      for (let i = 0; i < width * h; i++) gray[i] = data[i * 4];
      return { gray, width, height: h };
    },
    // The strokes as written: [[{ x, y }]] in CSS pixels (a copy).
    getStrokes() {
      return strokes.current.map((stroke) => stroke.map((p) => ({ ...p })));
    },
  }));

  // Latest props for the native listeners below (attached once, so they read them from here).
  const latest = useRef({ size, height, allowAnyPointer, locked, onStroke, onSelect, onPenDown, lineWidth });
  useLayoutEffect(() => {
    latest.current = { size, height, allowAnyPointer, locked, onStroke, onSelect, onPenDown, lineWidth };
  });

  // Pen input. The listeners are attached directly to the canvas with { passive: false } rather
  // than through React props: React's touch listeners are passive, so preventDefault() there
  // can't stop Safari's own gesture handling, which swallowed the start of a Pencil stroke.
  // Stroke data lives in refs and each new segment is drawn straight onto the canvas, so
  // nothing re-renders while the pen is moving. The parent hears about the stroke (onStroke,
  // which selects this box for 消す) only when the pen lifts.
  useEffect(() => {
    const canvas = canvasRef.current;

    const point = (e) => {
      const rect = canvas.getBoundingClientRect();
      const { size: w, height: h } = latest.current;
      return { x: ((e.clientX - rect.left) / rect.width) * w, y: ((e.clientY - rect.top) / rect.height) * h };
    };
    const canDraw = (e) => e.pointerType === "pen" || latest.current.allowAnyPointer;
    const ctx = () => canvas.getContext("2d");

    function startStroke(e) {
      try {
        canvas.setPointerCapture(e.pointerId); // keep the stroke if the pen slips past the edge
      } catch {
        // not available for this pointer: the stroke still works inside the box
      }
      latest.current.onPenDown?.();
      const p = point(e);
      const stroke = [p];
      strokes.current.push(stroke);
      drawing.current = { pointerId: e.pointerId, stroke };
      drawStroke(ctx(), [p], latest.current.lineWidth); // a dot at the very first contact
    }

    function onPointerDown(e) {
      if (latest.current.locked) return;
      if (!canDraw(e)) {
        latest.current.onSelect?.();
        return;
      }
      e.preventDefault();
      startStroke(e);
    }

    function onPointerMove(e) {
      if (!canDraw(e) || (latest.current.locked && !drawing.current)) return;
      let d = drawing.current;
      if (!d) {
        // The pen is touching but pointerdown never arrived: start the stroke here.
        if (!(e.buttons & 1) && !(e.pressure > 0)) return;
        e.preventDefault();
        startStroke(e);
        return;
      }
      if (d.pointerId !== e.pointerId) return;
      e.preventDefault();
      const events = e.getCoalescedEvents?.() ?? [];
      const points = events.length ? events.map(point) : [point(e)];
      const c = ctx();
      for (const p of points) {
        const last = d.stroke[d.stroke.length - 1];
        d.stroke.push(p);
        drawStroke(c, [last, p], latest.current.lineWidth);
      }
    }

    function onPointerUp(e) {
      if (drawing.current?.pointerId !== e.pointerId) return;
      e.preventDefault();
      drawing.current = null;
      latest.current.onStroke?.();
    }

    const stopGesture = (e) => e.preventDefault();

    const opts = { passive: false };
    canvas.addEventListener("pointerdown", onPointerDown, opts);
    canvas.addEventListener("pointermove", onPointerMove, opts);
    canvas.addEventListener("pointerup", onPointerUp, opts);
    canvas.addEventListener("pointercancel", onPointerUp, opts);
    canvas.addEventListener("touchstart", stopGesture, opts);
    canvas.addEventListener("touchmove", stopGesture, opts);
    canvas.addEventListener("contextmenu", stopGesture);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown, opts);
      canvas.removeEventListener("pointermove", onPointerMove, opts);
      canvas.removeEventListener("pointerup", onPointerUp, opts);
      canvas.removeEventListener("pointercancel", onPointerUp, opts);
      canvas.removeEventListener("touchstart", stopGesture, opts);
      canvas.removeEventListener("touchmove", stopGesture, opts);
      canvas.removeEventListener("contextmenu", stopGesture);
    };
  }, []);

  const look = STATE_STYLE[state] ?? { border: selected ? colors.gold : colors.line, background: HW_COLORS.paper };

  return (
    <div
      style={{
        position: "relative", flex: "none", borderRadius: 10, overflow: "hidden",
        border: `3px solid ${look.border}`, background: look.background,
        boxShadow: selected && !state ? `0 0 0 2px ${colors.gold}` : "none",
      }}
    >
      {/* Layers, bottom to top: the box background (white, or the tint of a checked box), the four
          lines and trace letter (overlay), then the transparent ink canvas, so the ink is never covered. */}
      {overlay && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{overlay}</div>}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        style={{
          position: "relative", width: size, height, display: "block", background: "transparent",
          touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
        }}
      />
      {state === "pass" && (
        <span aria-hidden="true" style={{
          position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 999, pointerEvents: "none",
          display: "grid", placeItems: "center", background: HW_COLORS.pass, color: HW_COLORS.passInk, fontSize: 14, fontWeight: 700, lineHeight: 1,
        }}>✓</span>
      )}
    </div>
  );
}
