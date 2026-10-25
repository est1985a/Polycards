import { useState } from "react";
import StrokeGuide from "./StrokeGuide.jsx";
import { LETTER_GUIDES } from "./letterGuides.js";
import { btnPrimary, colors, fontBody, fontDisplay, panel } from "../styles/theme.js";

// Hidden page at /hw-letters (not linked from the app): every letter guide on the four lines, with
// its stroke order, so the teacher can check all 52 on the iPad. Teacher-only, so Japanese is written
// here directly.

const CAPITALS = Object.keys(LETTER_GUIDES).filter((l) => /[A-Z]/.test(l));
const SMALL = Object.keys(LETTER_GUIDES).filter((l) => /[a-z]/.test(l));

function LetterGrid({ title, letters, play }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {letters.map((letter) => (
          <div key={letter} style={{ display: "grid", gap: 6, justifyItems: "center", alignContent: "start" }}>
            <div lang="en" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 22 }}>{letter}</div>
            <StrokeGuide letter={letter} width={110} height={158} play={play} autoPlay={false} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HwLettersPage() {
  const [play, setPlay] = useState(0);
  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fontBody, textAlign: "left" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 64px", display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 24 }}>書き順チェック（/hw-letters）</h1>
          <a href="/" style={{ color: colors.muted, fontSize: 14 }}>アプリに戻る</a>
        </div>
        <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>
          全52文字のお手本です。「もう一度見る」で1文字ずつ、下のボタンで全部いっしょに書き順を再生します。
        </p>
        <button type="button" onClick={() => setPlay((p) => p + 1)} style={{ ...btnPrimary, minHeight: 48, justifySelf: "start", padding: "0 20px" }}>
          全部再生
        </button>
        <LetterGrid title="大文字" letters={CAPITALS} play={play} />
        <LetterGrid title="小文字" letters={SMALL} play={play} />
      </div>
    </div>
  );
}
