// Layout of the 先生用ガイド / Teacher Guide, shown below the student part of the "What is Polycards?"
// pop-up (AboutSheet.jsx), only for teacher accounts. Every entry is an i18n key; the wording is in
// src/i18n/ja.js (the teacherGuide.* keys). Same section shape as src/content/aboutPolycards.js, plus:
//   steps: a numbered list (what to tap, in order)
// The numbers in teacherGuide.honesty.* (30 answers, 30 points, 1 second, 50%) are typed by hand:
// update both languages if HONESTY in src/lib/honesty.js changes.
export const TEACHER_GUIDE = {
  title: 'teacherGuide.title',
  subtitle: 'teacherGuide.subtitle',
  sections: [
    {
      icon: '🏫',
      heading: 'teacherGuide.create.heading',
      steps: ['teacherGuide.create.1', 'teacherGuide.create.2', 'teacherGuide.create.3'],
    },
    {
      icon: '🔍',
      heading: 'teacherGuide.search.heading',
      steps: ['teacherGuide.search.1', 'teacherGuide.search.2', 'teacherGuide.search.3'],
    },
    {
      icon: '📋',
      heading: 'teacherGuide.roster.heading',
      paragraphs: ['teacherGuide.roster.p1', 'teacherGuide.roster.p2', 'teacherGuide.roster.p3'],
    },
    {
      icon: '📊',
      heading: 'teacherGuide.student.heading',
      paragraphs: ['teacherGuide.student.p1', 'teacherGuide.student.p2'],
      list: ['teacherGuide.honesty.gap', 'teacherGuide.honesty.speed', 'teacherGuide.honesty.data'],
      paragraphsEnd: ['teacherGuide.honesty.note'],
    },
    {
      icon: '📈',
      heading: 'teacherGuide.overview.heading',
      paragraphs: ['teacherGuide.overview.p1', 'teacherGuide.overview.p2', 'teacherGuide.overview.p3'],
    },
    {
      icon: '📝',
      heading: 'teacherGuide.assign.heading',
      steps: ['teacherGuide.assign.1', 'teacherGuide.assign.2', 'teacherGuide.assign.3'],
      paragraphsEnd: ['teacherGuide.assign.p1'],
    },
    {
      icon: '🎁',
      heading: 'teacherGuide.award.heading',
      steps: ['teacherGuide.award.1', 'teacherGuide.award.2', 'teacherGuide.award.3'],
    },
    {
      icon: '🏆',
      heading: 'teacherGuide.ranking.heading',
      paragraphs: ['teacherGuide.ranking.p1', 'teacherGuide.ranking.p2'],
    },
    {
      icon: '💾',
      heading: 'teacherGuide.csv.heading',
      paragraphs: ['teacherGuide.csv.p1'],
      list: ['teacherGuide.csv.overview', 'teacherGuide.csv.assignment', 'teacherGuide.csv.awards'],
      paragraphsEnd: ['teacherGuide.csv.p2'],
    },
  ],
  tips: {
    icon: '💡',
    heading: 'teacherGuide.tips.heading',
    list: ['teacherGuide.tips.1', 'teacherGuide.tips.2', 'teacherGuide.tips.3', 'teacherGuide.tips.4'],
  },
};
