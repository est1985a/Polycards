// Text of the "What is Polycards?" pop-up (AboutSheet.jsx). Edit the wording here; the layout stays the same.
//
// Each section can have:
//   paragraphsBefore / paragraphsAfter: paragraphs above and below the level ladder chips
//     (the chips are drawn only in a section that has these)
//   paragraphs: ordinary paragraphs
//   list: list items (shown as a bulleted list)
// The section number (1., 2., …) is added by the layout.
// {sessionSize} is replaced with the student's own 1回の枚数 (10, 20 or 30, chosen in settings).
export const ABOUT = {
  title: 'What is Polycards?',
  subtitle: 'ポリカードのしくみ',
  sections: [
    {
      heading: 'Forgetting is normal',
      paragraphs: [
        '新しく覚えた単語は、何もしないと数日でほとんど忘れてしまいます。これは「忘却曲線」と言って、だれにでも起こることです。でも、忘れそうになったときにもう一度思い出すと、記憶は前よりずっと長く残ります。',
      ],
    },
    {
      heading: 'The level ladder',
      paragraphsBefore: [
        '「わかった」を押すと、カードは1段上がり、次に出てくるまでの時間がのびます。',
      ],
      paragraphsAfter: [
        '「まだ」を押すと、カードは少し下がって、早めにまた出てきます。まちがえても大丈夫。思い出そうとすること自体が勉強です。',
      ],
    },
    {
      heading: 'The science',
      paragraphs: [
        'Polycardsは、研究で効果が確かめられている2つの方法を使っています。',
      ],
      list: [
        'Spaced repetition（間隔反復）：時間をあけて何回か復習する。一度にたくさんやるより、よく覚えられます。',
        'Retrieval practice（思い出す練習）：答えを見る前に、頭の中で思い出す。ただ読むだけより、記憶に残ります。',
      ],
    },
    {
      heading: 'Why it helps you',
      list: [
        '覚えている単語には時間を使わず、忘れそうな単語だけ復習できる',
        '1回は{sessionSize}枚まで。毎日少しずつでOK',
        'テストのあとも、ずっと覚えていられる',
      ],
    },
    {
      heading: 'Tips',
      list: [
        '毎日少しずつやろう（まとめてやるより効果的）',
        '答えを見る前に、本気で思い出そう',
        '正直に「わかった」「まだ」を押そう。うそをつくと、自分が覚えられなくなるだけです',
        'English → 日本語 と 日本語 → English は別のカードです',
      ],
    },
  ],
};

// Fills in {sessionSize} in the wording.
export function fillAboutText(text, sessionSize) {
  return text.replaceAll('{sessionSize}', String(sessionSize));
}
