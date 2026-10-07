import { colors, tabActive, tabInactive } from '../styles/theme';

// tabs: [{ id: 'myCards', label: 'My Cards' }, ...]
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${colors.line}`, marginBottom: 20 }}>
      {tabs.map((t) => (
        <div key={t.id} style={active === t.id ? tabActive : tabInactive} onClick={() => onChange(t.id)}>
          {t.label}
        </div>
      ))}
    </div>
  );
}
