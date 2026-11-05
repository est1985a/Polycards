import { useState } from 'react';
import { colors, cardStyle, btnGhost, btnLink, fontBody } from '../styles/theme';

const inputStyle = {
  width: "100%", boxSizing: "border-box", minHeight: 44, padding: "10px 12px",
  borderRadius: 8, border: `1px solid ${colors.line}`, background: colors.surface2,
  color: colors.text, fontFamily: fontBody, fontSize: 16,
};
const labelStyle = { display: "grid", gap: 6, textAlign: "left", fontSize: 13, color: colors.muted };

// Typing helpers that would change a username or password on an iPad are switched off.
const noAutoFix = { autoCapitalize: "off", autoCorrect: "off", spellCheck: false };

// initialOpen only lets the tests see the test-login form (they can't tap the link).
// notice = { title, body } (OAUTH_NOTICES in login.js): a Google sign-in that came back with an
// error, e.g. it ran out of time. Shown calmly in gold above the Google button, not as a red error.
export default function LoginScreen({ error, notice, onGoogleLogin, onPasswordLogin, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = !busy && username.trim() !== "" && password !== "";

  async function handleSubmit(e) {
    e.preventDefault(); // Enter in either box submits the form
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onPasswordLogin(username, password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...cardStyle, padding: 30, textAlign: "center", marginTop: 40, display: "grid", gap: 16 }}>
      <h2 style={{ fontSize: 18, color: colors.text, margin: 0 }}>Sign in to start studying</h2>
      {notice && (
        <div
          role="alert"
          style={{
            border: `2px solid ${colors.gold}`, borderRadius: 12, padding: "12px 14px",
            background: colors.surface2, textAlign: "left", display: "grid", gap: 6,
          }}
        >
          <p style={{ color: colors.gold, fontWeight: 700, fontSize: 15, margin: 0 }}>{notice.title}</p>
          <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{notice.body}</p>
        </div>
      )}
      {error && <p style={{ color: colors.danger, fontSize: 13, margin: 0 }}>{error}</p>}
      <button onClick={onGoogleLogin} style={{ ...btnGhost, width: "100%" }}>Sign In with Google</button>

      <button
        type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ ...btnLink, justifySelf: "center", minHeight: 44 }}
      >
        テスト用ログイン
      </button>

      {open && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={labelStyle}>
            ユーザー名
            <input
              type="text" name="username" autoComplete="username" {...noAutoFix}
              value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            パスワード
            <input
              type="password" name="password" autoComplete="current-password" {...noAutoFix}
              value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle}
            />
          </label>
          <button
            type="submit" disabled={!canSubmit}
            style={{ ...btnGhost, width: "100%", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "default" }}
          >
            {busy ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      )}
    </div>
  );
}
