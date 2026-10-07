import { colors } from '../styles/theme';
import LibrarySection from './LibrarySection';

export default function CardSetsTab({ library, loading, onOpenDeck, disabled }) {
  if (loading) {
    return <p style={{ textAlign: "center", color: colors.muted }}>Loading library from database...</p>;
  }
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <LibrarySection title="High School" textbooks={library.HS} onOpenDeck={onOpenDeck} disabled={disabled} />
      <LibrarySection title="Junior High School" textbooks={library.JHS} onOpenDeck={onOpenDeck} disabled={disabled} />
      <LibrarySection title="Other" textbooks={library.Other} onOpenDeck={onOpenDeck} disabled={disabled} />
    </div>
  );
}
