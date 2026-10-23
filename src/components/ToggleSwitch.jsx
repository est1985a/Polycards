import { colors } from '../styles/theme';

// The track and knob of an on/off switch (decoration only). Put it inside a button with
// role="switch" and aria-checked, which does the work.
export default function ToggleSwitch({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative", width: 52, height: 30, flexShrink: 0, boxSizing: "border-box", borderRadius: 15,
        background: on ? colors.accent : colors.surface2, border: `2px solid ${on ? colors.accent : colors.line}`,
      }}
    >
      <span
        className="toggle-knob"
        style={{
          position: "absolute", top: 2, left: on ? 24 : 2, width: 22, height: 22, borderRadius: "50%",
          background: on ? colors.accentInk : colors.muted, transition: "left 150ms",
        }}
      />
    </span>
  );
}
