import { useEffect, useRef, useState } from "react";
import FourLines from "./FourLines.jsx";
import { HW_COLORS } from "./config.js";
import { LETTER_GUIDES, letterMapper, lineMetrics, phraseParts, strokePath } from "./letterGuides.js";
import { reduceMotionOn } from "../lib/settings.js";
import { btnGhost, colors, fontDisplay } from "../styles/theme.js";
import { t } from "../i18n";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Where each stroke's numbered start dot goes: on the stroke's start, nudged right when an earlier
// stroke starts at the same place (A, M), so the numbers don't cover each other.
function markerPoints(strokes, map, gap) {
  const placed = [];
  return strokes.map((st) => {
    let [x, y] = map(st.start);
    while (placed.some(([px, py]) => Math.hypot(px - x, py - y) < gap * 0.3)) x += gap * 0.42;
    placed.push([x, y]);
    return [x, y];
  });
}

// The stroke-order guide for one letter: the letter on the four lines, each stroke drawn in turn
// with a numbered start dot, and (steps) one short line per stroke under it. Plays once when it
// appears (autoPlay); もう一度見る (showReplay) or a new `play` number plays it again. With reduce
// motion the finished letter is shown, with its numbers, and nothing moves.
// Give it a new `key` per letter.
export default function StrokeGuide({ letter, width = 150, height = 216, autoPlay = true, play = 0, showReplay = true, steps = true }) {
  const guide = LETTER_GUIDES[letter];
  const map = letterMapper(letter, width, height);
  const { gap } = lineMetrics(height);
  const ink = gap * 0.2;
  const markers = markerPoints(guide.strokes, map, gap);
  const strokeRefs = useRef([]);
  const markerRefs = useRef([]);
  const [replays, setReplays] = useState(autoPlay ? 1 : 0);
  const [active, setActive] = useState(-1);
  const hiddenAtStart = autoPlay && !reduceMotionOn();
  const run = replays + play; // changes on もう一度見る and on each new `play`

  // Draws the strokes one by one, straight on the SVG elements (nothing re-renders mid-stroke).
  useEffect(() => {
    if (run === 0) return;
    const els = strokeRefs.current;
    const marks = markerRefs.current;
    const show = (el, on) => { if (el) el.style.opacity = on ? "1" : "0"; };
    const stopAll = () => els.forEach((el) => el?.getAnimations?.().forEach((a) => a.cancel()));
    if (reduceMotionOn()) {
      stopAll();
      els.forEach((el) => { show(el, true); if (el) el.style.strokeDashoffset = "0"; });
      marks.forEach((m) => show(m, true));
      return;
    }
    let cancelled = false;
    stopAll();
    els.forEach((el) => show(el, false));
    marks.forEach((m) => show(m, false));
    (async () => {
      await wait(250);
      for (let i = 0; i < els.length && !cancelled; i++) {
        const el = els[i];
        setActive(i);
        show(marks[i], true);
        if (el?.getTotalLength && el.animate) {
          const len = el.getTotalLength();
          el.style.strokeDasharray = `${len} ${len}`;
          el.style.strokeDashoffset = `${len}`;
          show(el, true);
          const anim = el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
            duration: Math.min(1400, Math.max(450, len * 7)), easing: "ease-in-out", fill: "forwards",
          });
          try { await anim.finished; } catch { return; }
        } else {
          show(el, true);
          await wait(350);
        }
        await wait(220);
      }
      if (!cancelled) setActive(-1);
    })();
    return () => { cancelled = true; };
  }, [run]);

  const hidden = hiddenAtStart ? 0 : 1;

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <div style={{ borderRadius: 10, overflow: "hidden", border: `3px solid ${colors.line}`, background: HW_COLORS.paper, position: "relative" }}>
        <svg
          width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}
          role="img" aria-label={t("practice.guideAria", { letter })}
        >
          <FourLines width={width} height={height} trace={letter} />
          {guide.strokes.map((st, i) => (st.dot ? (
            <circle
              key={`s${i}`} ref={(el) => { strokeRefs.current[i] = el; }}
              cx={map(st.start)[0]} cy={map(st.start)[1]} r={ink * 0.75} fill={HW_COLORS.ink} style={{ opacity: hidden }}
            />
          ) : (
            <path
              key={`s${i}`} ref={(el) => { strokeRefs.current[i] = el; }}
              d={strokePath(st, map)} fill="none" stroke={HW_COLORS.ink} strokeWidth={ink}
              strokeLinecap="round" strokeLinejoin="round" style={{ opacity: hidden }}
            />
          )))}
          {markers.map(([x, y], i) => (
            <g key={`m${i}`} ref={(el) => { markerRefs.current[i] = el; }} style={{ opacity: hidden }}>
              <circle cx={x} cy={y} r={gap * 0.21} fill={HW_COLORS.startDot} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={HW_COLORS.startText}
                style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: gap * 0.28 }}>
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {steps && (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 2, fontSize: 13, color: colors.text, maxWidth: Math.max(width, 250) }}>
          {guide.strokes.map((st, i) => (
            <li key={i} style={{ display: "flex", gap: 6, alignItems: "baseline", fontWeight: active === i ? 700 : 400 }}>
              <span style={{
                flex: "none", width: 18, height: 18, borderRadius: 999, display: "inline-grid", placeItems: "center",
                background: HW_COLORS.startDot, color: HW_COLORS.startText, fontFamily: fontDisplay, fontSize: 11, fontWeight: 700,
              }}>{i + 1}</span>
              <span>{phraseParts(t(`practice.stroke.${st.kind}`)).map((part, j) => (
                <span key={j} style={{ display: "inline-block", whiteSpace: "nowrap" }}>{part}</span>
              ))}</span>
            </li>
          ))}
        </ol>
      )}
      {showReplay && (
        <button type="button" onClick={() => setReplays((r) => r + 1)} style={{ ...btnGhost, minHeight: 44, padding: "0 16px", fontSize: 14 }}>
          {t("practice.replay")}
        </button>
      )}
    </div>
  );
}
