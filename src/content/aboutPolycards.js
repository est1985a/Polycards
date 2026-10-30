// Layout of the "What is Polycards?" pop-up (AboutSheet.jsx). Every entry here is an i18n key;
// the wording itself is in src/i18n/ja.js (the about.* keys). The layout stays the same.
//
// Each section can have:
//   icon: an emoji shown before the heading (hidden from screen readers)
//   paragraphsBefore / paragraphsAfter: paragraphs above and below the level ladder chips
//     (the chips are drawn only in a section that has these)
//   paragraphs: ordinary paragraphs
//   list: list items (shown as a bulleted list)
//   paragraphsEnd: paragraphs after the list
//   when: only shown when this feature is on ('training' = the Training tab, 'handwriting' = 手書き)
// A paragraph or list item can also be { key, when } to show only that line when the feature is on.
// The numbered sections get ①, ②, … from the layout; intro, tips and the もっと詳しく part have no number.
// {sessionSize} in the wording is replaced with the student's own 1回の枚数 (10, 20 or 30, chosen in settings).
export const ABOUT = {
  title: 'about.title',
  subtitle: 'about.subtitle',
  intro: { icon: '🃏', paragraphs: ['about.intro.p1'] },
  sections: [
    {
      icon: '📦',
      heading: 'about.packs.heading',
      paragraphs: ['about.packs.p1', 'about.packs.p2'],
    },
    {
      icon: '🔁',
      heading: 'about.review.heading',
      paragraphsBefore: ['about.review.before'],
      paragraphsAfter: ['about.review.after'],
    },
    {
      icon: '🙆',
      heading: 'about.honest.heading',
      paragraphs: ['about.honest.p1'],
    },
    {
      icon: '✍️',
      heading: 'about.modes.heading',
      paragraphs: ['about.modes.p1'],
      list: ['about.modes.tap', 'about.modes.typing', { key: 'about.modes.handwriting', when: 'handwriting' }],
      paragraphsEnd: ['about.modes.p2'],
    },
    {
      icon: '⭐',
      heading: 'about.exp.heading',
      paragraphs: ['about.exp.p1', 'about.exp.p2'],
    },
    {
      icon: '🎫',
      heading: 'about.tickets.heading',
      paragraphs: ['about.tickets.p1'],
    },
    {
      icon: '🏋️',
      heading: 'about.training.heading',
      paragraphs: ['about.training.p1'],
      when: 'training',
    },
    {
      icon: '🏫',
      heading: 'about.class.heading',
      paragraphs: ['about.class.p1', 'about.class.p2'],
    },
    {
      icon: '📅',
      heading: 'about.stats.heading',
      paragraphs: ['about.stats.p1'],
    },
  ],
  tips: {
    icon: '💡',
    heading: 'about.tips.heading',
    list: ['about.tips.1', 'about.tips.2', 'about.tips.3'],
  },
  // Closed by default (a <details>): the forgetting curve and the research behind Polycards.
  more: {
    summary: 'about.more.summary',
    sections: [
      { heading: 'about.forgetting.heading', paragraphs: ['about.forgetting.p1'] },
      { heading: 'about.science.heading', paragraphs: ['about.science.p1'], list: ['about.science.spaced', 'about.science.retrieval'] },
    ],
  },
};
