import { useEffect, useRef, useState } from "react";
import LetterBoxes from "./LetterBoxes.jsx";
import { loadModel, predictBatch, topK } from "./model.js";
import { preprocessLetter } from "./preprocess.js";
import { flatten28, modelCheck, preprocessCheck } from "./selfCheck.js";
import { answerSlots } from "./answerLayout.js";
import { lenientMessage, scoreWord } from "./checkAnswer.js";
import { HW_COLORS, TEST_DATA_URL } from "./config.js";
import { btnPrimary, colors, fontBody, fontDisplay, panel } from "../styles/theme.js";

// Hidden test page at /hw-test (not linked from the app): self-checks against the Python
// reference data, then free practice with the letter boxes and what the model saw.

const SCORE_LABEL = { correct: "正解", lenient: "おまけ正解", wrong: "ちがう" };
const SCORE_COLOR = { correct: colors.accentText, lenient: HW_COLORS.lenient, wrong: colors.danger };

async function fetchJson(path) {
  const res = await fetch(TEST_DATA_URL + path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// A PNG → grayscale pixels the same way the app reads a box: canvas filled white, red channel.
function loadGrayImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth, height = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = HW_COLORS.paper;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, width, height);
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) gray[i] = data[i * 4];
      resolve({ gray, width, height });
    };
    img.onerror = () => reject(new Error(`${url} を読み込めませんでした`));
    img.src = url;
  });
}

async function runSelfChecks() {
  const golden = await fetchJson("golden.json");
  const goldenRun = await predictBatch(golden.map((g) => flatten28(g.input)));
  const modelRows = golden.map((g, i) => modelCheck(g, goldenRun.probs[i]));

  const expected = await fetchJson("preprocess_test/expected.json");
  const images = await Promise.all(expected.map((e) => loadGrayImage(`${TEST_DATA_URL}preprocess_test/${e.file}`)));
  const inputs = images.map(({ gray, width, height }) => preprocessLetter(gray, width, height));
  const prepRun = await predictBatch(inputs.map((x) => x ?? new Float32Array(784)));
  const prepRows = expected.map((e, i) => preprocessCheck(e, inputs[i], inputs[i] ? prepRun.probs[i] : null));

  return { modelRows, prepRows, predictMs: goldenRun.predictMs };
}

// The 28×28 input the model saw, drawn larger with sharp pixels.
function InputPreview({ input, size = 84 }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    const img = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = Math.round((input?.[i] ?? 0) * 255);
      img.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }, [input]);
  return <canvas ref={ref} width={28} height={28} style={{ width: size, height: size, imageRendering: "pixelated", borderRadius: 4, border: `1px solid ${colors.line}` }} />;
}

function PassBadge({ pass }) {
  return (
    <span style={{ fontFamily: fontDisplay, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
      background: pass ? colors.accent : colors.danger, color: pass ? colors.accentInk : colors.dangerInk }}>
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

function CheckBlock({ title, rows, describe }) {
  const pass = rows.length > 0 && rows.every((r) => r.pass);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
        <PassBadge pass={pass} /> {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: colors.muted, fontFamily: "monospace" }}>
        {rows.map((r, i) => (
          <li key={i} style={{ color: r.pass ? colors.muted : colors.danger }}>{describe(r)}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HwTestPage() {
  const [model, setModel] = useState({ status: "loading" }); // loading | ready | error
  const [checks, setChecks] = useState(null);
  const [checkError, setCheckError] = useState(null);
  const [word, setWord] = useState("fish");
  const [anyPointer, setAnyPointer] = useState(false);
  const [result, setResult] = useState(null); // { boxes: [{ target, input, top3, score }], summary, predictMs }
  const [busy, setBusy] = useState(false);
  const boxesRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadModel()
      .then(async ({ backend, loadMs }) => {
        if (!alive) return;
        setModel({ status: "ready", backend, loadMs });
        try {
          const c = await runSelfChecks();
          if (alive) setChecks(c);
        } catch (e) {
          if (alive) setCheckError(String(e?.message ?? e));
        }
      })
      .catch((e) => alive && setModel({ status: "error", message: String(e?.message ?? e) }));
    return () => { alive = false; };
  }, []);

  const targets = answerSlots(word).filter((s) => s.type === "box").map((s) => s.letter);

  async function handleAnswer() {
    setBusy(true);
    try {
      const raw = boxesRef.current.getBoxes();
      const inputs = raw.map((b) => (b ? preprocessLetter(b.gray, b.width, b.height) : null));
      const filled = inputs.filter(Boolean);
      const { probs, predictMs } = await predictBatch(filled);
      let k = 0;
      const boxes = inputs.map((input, i) => {
        const top3 = input ? topK(probs[k++], 3) : [];
        return { target: targets[i], input, top3, read: top3[0]?.letter ?? null };
      });
      const summary = scoreWord(boxes.map((b) => ({ target: b.target, read: b.read })));
      setResult({ boxes: boxes.map((b, i) => ({ ...b, score: summary.scores[i] })), summary, predictMs, sizes: raw.map((b) => b && `${b.width}×${b.height}`) });
    } finally {
      setBusy(false);
    }
  }

  function changeWord(value) {
    setWord(value);
    setResult(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fontBody, textAlign: "left" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 64px", display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 24 }}>手書きテスト（/hw-test）</h1>
          <a href="/" style={{ color: colors.muted, fontSize: 14 }}>アプリに戻る</a>
        </div>

        <section style={{ ...panel, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 14, color: colors.muted }}>
            {model.status === "loading" && "モデルを読み込み中…"}
            {model.status === "error" && <span style={{ color: colors.danger }}>モデルを読み込めませんでした：{model.message}</span>}
            {model.status === "ready" && (
              <>
                Backend: <b style={{ color: colors.text }}>{model.backend}</b>{"\u3000"}
                Load: <b style={{ color: colors.text }}>{Math.round(model.loadMs)} ms</b>
                {checks && <>{"\u3000"}Predict (5 letters, first run incl. WebGL warm-up): <b style={{ color: colors.text }}>{checks.predictMs.toFixed(1)} ms</b></>}
              </>
            )}
          </div>
          {checkError && <div style={{ color: colors.danger }}>セルフチェックでエラー：{checkError}</div>}
          {model.status === "ready" && !checks && !checkError && <div style={{ color: colors.muted }}>セルフチェック中…</div>}
          {checks && (
            <>
              <CheckBlock
                title="Model check (golden.json)"
                rows={checks.modelRows}
                describe={(r) => `${r.label}: top=${r.top}, max diff=${r.diff.toExponential(2)}`}
              />
              <CheckBlock
                title="Preprocessing check (preprocess_test/)"
                rows={checks.prepRows}
                describe={(r) => `${r.file}: mean diff=${r.diff.toFixed(4)}, top=${r.top} (expected ${r.expectedTop})`}
              />
            </>
          )}
        </section>

        <section style={{ ...panel, display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>自由練習</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              単語：
              <input
                value={word}
                onChange={(e) => changeWord(e.target.value)}
                autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} lang="en"
                style={{ fontSize: 18, padding: "8px 10px", minHeight: 44, borderRadius: 8, border: `1px solid ${colors.line}`, background: colors.surface2, color: colors.text, width: 260 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}>
              <input type="checkbox" checked={anyPointer} onChange={(e) => setAnyPointer(e.target.checked)} style={{ width: 20, height: 20 }} />
              指・マウスでも書く（テスト用）
            </label>
          </div>

          {targets.length > 0 && (
            <LetterBoxes
              key={word}
              ref={boxesRef}
              answer={word}
              scores={result ? result.boxes.map((b) => b.score) : []}
              allowAnyPointer={anyPointer}
              onChange={() => setResult(null)}
            />
          )}

          <button
            type="button"
            onClick={handleAnswer}
            disabled={busy || model.status !== "ready" || targets.length === 0}
            style={{ ...btnPrimary, minHeight: 52, fontSize: 18, justifySelf: "center", minWidth: 200 }}
          >
            {busy ? "読み取り中…" : "こたえる"}
          </button>

          {result && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>
                {result.summary.allCorrect ? "○ 正解" : "× まちがいあり"}
                <span style={{ fontWeight: 400, color: colors.muted, fontSize: 13 }}>{"\u3000"}Predict: {result.predictMs.toFixed(1)} ms（{result.boxes.filter((b) => b.input).length} 文字を1回で）</span>
              </div>
              {result.summary.lenientPairs.map((p) => (
                <div key={p.target + p.read} style={{ color: HW_COLORS.lenient, fontWeight: 700 }}>{lenientMessage(p)}</div>
              ))}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {result.boxes.map((b, i) => (
                  <div key={i} style={{ background: colors.surface2, borderRadius: 10, padding: 10, display: "grid", gap: 6, justifyItems: "center", minWidth: 110,
                    border: `2px solid ${SCORE_COLOR[b.score]}` }}>
                    <div style={{ fontSize: 13, color: colors.muted }}>{i + 1}: 「{b.target}」</div>
                    <InputPreview input={b.input} />
                    {b.input ? (
                      <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.5 }}>
                        {b.top3.map((t) => <div key={t.letter}>{t.letter}{"\u3000"}{(t.prob * 100).toFixed(1)}%</div>)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: colors.muted }}>（空）</div>
                    )}
                    <div style={{ fontWeight: 700, color: SCORE_COLOR[b.score] }}>{SCORE_LABEL[b.score]}</div>
                    {result.sizes[i] && <div style={{ fontSize: 11, color: colors.muted }}>{result.sizes[i]} px</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
