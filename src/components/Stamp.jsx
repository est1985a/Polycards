import { colors } from '../styles/theme';

// One circle in the "correct answers" row of the Card Sets drill.
export default function Stamp({ filled }) {
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: "50%",
        border: `2px solid ${filled ? colors.red : colors.lineDark}`,
        background: filled ? colors.red : "transparent",
        display: "inline-block",
      }}
    />
  );
}
