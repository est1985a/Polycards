// Layout of the "What is Polycards?" pop-up (AboutSheet.jsx). Every entry here is an i18n key;
// the wording itself is in src/i18n/ja.js (the about.* keys). The layout stays the same.
//
// Each section can have:
//   paragraphsBefore / paragraphsAfter: paragraphs above and below the level ladder chips
//     (the chips are drawn only in a section that has these)
//   paragraphs: ordinary paragraphs
//   list: list items (shown as a bulleted list)
// The section number (1., 2., …) is added by the layout.
// {sessionSize} in the wording is replaced with the student's own 1回の枚数 (10, 20 or 30, chosen in settings).
export const ABOUT = {
  title: 'about.title',
  subtitle: 'about.subtitle',
  sections: [
    {
      heading: 'about.forgetting.heading',
      paragraphs: ['about.forgetting.p1'],
    },
    {
      heading: 'about.ladder.heading',
      paragraphsBefore: ['about.ladder.before'],
      paragraphsAfter: ['about.ladder.after'],
    },
    {
      heading: 'about.science.heading',
      paragraphs: ['about.science.p1'],
      list: ['about.science.spaced', 'about.science.retrieval'],
    },
    {
      heading: 'about.why.heading',
      list: ['about.why.1', 'about.why.2', 'about.why.3'],
    },
    {
      heading: 'about.tips.heading',
      list: ['about.tips.1', 'about.tips.2', 'about.tips.3', 'about.tips.4'],
    },
  ],
};
