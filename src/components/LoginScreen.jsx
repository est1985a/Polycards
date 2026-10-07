import { colors, cardStyle, btnGhost } from '../styles/theme';

export default function LoginScreen({ error, onGoogleLogin }) {
  return (
    <div style={{ ...cardStyle, padding: 30, textAlign: "center", marginTop: 40, display: "grid", gap: 16 }}>
      <h2 style={{ fontSize: 18, color: colors.navy, margin: 0 }}>Sign in to start studying</h2>
      {error && <p style={{ color: colors.red, fontSize: 13, margin: 0 }}>{error}</p>}
      <button onClick={onGoogleLogin} style={{ ...btnGhost, width: "100%" }}>Sign In with Google</button>
    </div>
  );
}
