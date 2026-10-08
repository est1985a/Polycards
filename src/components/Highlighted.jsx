import { Fragment } from 'react';
import { colors } from '../styles/theme';
import { highlightParts } from '../lib/dictionary';

// An example sentence with the card's word in bold gold (see highlightParts).
export default function Highlighted({ sentence, english }) {
  return highlightParts(sentence, english).map((p, i) =>
    p.hit
      ? <strong key={i} style={{ color: colors.gold }}>{p.text}</strong>
      : <Fragment key={i}>{p.text}</Fragment>
  );
}
