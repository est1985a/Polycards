import { colors, fontDisplay, btnLink } from '../styles/theme';

export default function Header({ showSignOut, onSignOut }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
      <h1 style={{ fontFamily: fontDisplay, fontSize: 24, margin: 0, color: colors.text }}>
        Polycards
      </h1>
      {showSignOut && (
        <button onClick={onSignOut} style={{ ...btnLink, padding: undefined }}>
          Sign Out
        </button>
      )}
    </div>
  );
}
