import { useEffect, useImperativeHandle, useRef } from "react";
import { HW_COLORS, STROKE_RATIO } from "./config.js";
import { colors } from "../styles/theme.js";

// Border and background for a checked box.
const STATE_STYLE = {
  correct: { border: colors.accent, background: HW_COLORS.paper },
  lenient: { border: HW_COLORS.lenient, background: HW_COLORS.lenientBg },
  wrong: { border: colors.danger, background: HW_COLORS.paper },
};

// One square letter box: a canvas the student writes one letter in.
// Only the Apple Pencil draws (pointerType "pen") unless allowAnyPointer is set (test page).
// A finger or mouse tap that doesn't draw selects the box instead (for 消す).
// ref → { undo(), clear(), isEmpty(), getGray() }
export default function LetterBox({ ref, size, state = null, selected = false, allowAnyPointer = false, label, onStroke, onSelect }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]); // each stroke: [{ x, y }] in CSS pixels
  const drawing = useRef(null); // { pointerId, stroke }

  const lineWidth = Math.max(2, size * STROKE_RATIO);

  // Draws all strokes from scratch (after undo / clear / resize).
  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = canvas.width / size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = HW_COLORS.paper;
    ctx.fillRect(0, 0, size, size);
    for (const stroke of strokes.current) drawStroke(ctx, stroke);
  }

  function drawStroke(ctx, stroke) {
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

  // Size the canvas at the device pixel ratio so strokes are sharp.
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

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
    // pixel size, which is what preprocessLetter is given.
    getGray() {
      const canvas = canvasRef.current;
      const { width, height } = canvas;
      const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) gray[i] = data[i * 4];
      return { gray, width, height };
    },
  }));

  function point(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * size, y: ((e.clientY - rect.top) / rect.height) * size };
  }

  function canDraw(e) {
    return e.pointerType === "pen" || allowAnyPointer;
  }

  function handleDown(e) {
    if (!canDraw(e)) {
      onSelect?.();
      return;
    }
    e.preventDefault();
    try {
      canvasRef.current.setPointerCapture(e.pointerId); // keep the stroke if the pen slips past the edge
    } catch {
      // not available for this pointer: the stroke still works inside the box
    }
    const stroke = [point(e)];
    strokes.current.push(stroke);
    drawing.current = { pointerId: e.pointerId, stroke };
    redraw();
    onStroke?.();
  }

  function handleMove(e) {
    const d = drawing.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = events.length ? events.map(point) : [point(e)];
    const ctx = canvasRef.current.getContext("2d");
    for (const p of points) {
      const last = d.stroke[d.stroke.length - 1];
      d.stroke.push(p);
      drawStroke(ctx, [last, p]);
    }
  }

  function handleUp(e) {
    if (drawing.current?.pointerId !== e.pointerId) return;
    e.preventDefault();
    drawing.current = null;
  }

  const look = STATE_STYLE[state] ?? { border: selected ? colors.gold : colors.line, background: HW_COLORS.paper };

  return (
    <div
      style={{
        position: "relative", flex: "none", borderRadius: 10, overflow: "hidden",
        border: `3px solid ${look.border}`, background: HW_COLORS.paper,
        boxShadow: selected && !state ? `0 0 0 2px ${colors.gold}` : "none",
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: size, height: size, display: "block",
          touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
        }}
      />
      {/* A checked box is tinted on top (the canvas itself stays white paper for the model). */}
      {look.background !== HW_COLORS.paper && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: look.background, mixBlendMode: "multiply", pointerEvents: "none" }} />
      )}
    </div>
  );
}
