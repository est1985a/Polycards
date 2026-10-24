// All of the app's own text, in Japanese (the default language).
// Each entry is a key and its text. {name} in a text is a placeholder: the app fills it in
// (a number, a word, a date…). Keep every placeholder when writing another language.
// An entry may also be a function of the placeholders, e.g. ({ n }) => (n === 1 ? "1 card" : `${n} cards`),
// for text that changes with a number (English plurals). "" means "show nothing here".
// Not in here: the login screen (always Japanese), word and card content from the database,
// avatar names, theme names and the direction labels ("English to Japanese" / "Japanese to English").
export default {
  // Shared: used on several screens
  "common.loading": "読み込み中…",
  "common.cancel": "キャンセル",
  "common.close": "閉じる (Close)", // read aloud for the × button of a pop-up
  "common.mastered": "Mastered", // a card that was learned for good (after Lv7)
  "common.backToDashboard": "← ダッシュボードに戻る (Back to Dashboard)", // link above the Mastered list

  // Header at the top of every screen: logo button and gacha button (read aloud only)
  "header.home": "My Cards", // the Polycards logo, which goes back to My Cards
  "header.gacha": "ガチャ",
  "header.gachaTickets": "ガチャ (券 {n}枚)", // gacha button when the student has {n} tickets

  // Account menu (the round button with the student's initial)
  "menu.account": "アカウント (Account)",
  "menu.accountNewTheme": "アカウント (Account) 新しいテーマがあります", // read aloud when the dot shows (a new theme is unlocked)
  "menu.rank": "ランク {n}",
  "menu.stats": "学習の記録", // opens the stats page
  "menu.settings": "設定",
  "menu.help": "使い方", // opens the "What is Polycards?" pop-up
  "menu.signOut": "ログアウト",
  "menu.signOutConfirm": "ログアウトしますか？",

  // Bottom tab bar
  "tabs.myCards": "My Cards",
  "tabs.cardSets": "Card Sets",

  // My Cards dashboard: review button and マイデッキ list
  "myCards.startReview": "復習を始める",
  "myCards.dueTotal": "全{n}枚の復習があります", // under 復習を始める when more cards are due than one review holds
  "myCards.sessionCount": "{n}枚", // pill on the review button: cards in this review
  "myCards.nothingDue": "復習するカードはありません",
  "myCards.nextReview": "次の復習：{when}に {n}枚", // {when} is a time.* text, e.g. 2時間後 / 10月15日
  "myCards.nothingDueAlert": "今は復習するカードがありません。", // browser alert
  "myCards.mastered": "Mastered {n}", // button that opens the Mastered list; {n} = number of Mastered cards
  "myCards.myDecks": "マイデッキ", // heading of the student's decks
  "myCards.deckDue": "復習 {n}枚", // pill on a deck row: due cards in that deck
  "myCards.deckNothingDue": "今は復習なし",
  "myCards.remove": "削除 (Remove)", // the × on a deck row
  "myCards.removing": "削除中...",
  "myCards.removeConfirm": "「{name}」をマイカードから削除しますか？このデッキの復習の記録は消えます。", // browser confirm; {name} = deck name
  "myCards.empty.heading": "まだデッキがありません", // shown when no decks are added yet
  "myCards.empty.body": "「Card Sets」タブで教科書のユニットを選んで、「＋ マイカードに追加」を押しましょう。追加したカードはここで復習できます。",
  "myCards.empty.button": "Card Setsを見る", // button that opens the Card Sets tab

  // Player card and level chart on My Cards
  "stats.rankLabel": "ランク", // small label above the big "Rank N"
  "stats.rank": "Rank {n}",
  "stats.points": "{n} pt",
  "stats.best": "ベスト {n} pt", // highest points ever (shown when higher than the current points)
  "stats.spellingBonus": "スペルボーナス {n} pt", // points earned by correct spelling in typing mode
  "stats.openCollection": "アバター図鑑を開く", // aria-label of the avatar on the player card
  "stats.toNextRank": "次のランクまで",
  "stats.toNextRankLeft": "あと{value}", // {value} = stats.toNextRankValue, in bold
  "stats.toNextRankValue": "{n} pt → Rank {rank}", // points still needed, then the next rank
  "stats.chartTitle": "レベル別カード数",
  "stats.chartTotal": "全部で {n}枚",
  "stats.chartLevel": "Lv{n}", // label under each bar
  "stats.chartNote": "Lv7 のカードは約4か月後に復習。正解するとマスター！",
  // Stats page (学習の記録). Effort only: never accuracy.
  "stats.open": "学習の記録を見る", // aria-label of the player card (tapping it opens the stats page)
  "stats.openHint": "記録を見る", // small hint at the bottom right of the player card, followed by ›
  "stats.pageTitle": "学習の記録",
  "stats.streakDays": "{n}日連続", // {n} = the streak, in big numbers
  "stats.streakBest": "ベスト {n}日",
  "stats.streakKeep": "今日も復習して記録をのばそう！", // streak alive, today not done yet
  "stats.streakStart": "今日から始めよう！", // no streak
  "stats.calendarTitle": "勉強した日",
  "stats.monthTitle": "{year}年{month}月", // the month shown by the calendar and the chart; {month} is 1–12
  "stats.prevMonth": "前の月",
  "stats.nextMonth": "次の月",
  "stats.weekday0": "日", // calendar weekday row, Sunday first
  "stats.weekday1": "月",
  "stats.weekday2": "火",
  "stats.weekday3": "水",
  "stats.weekday4": "木",
  "stats.weekday5": "金",
  "stats.weekday6": "土",
  "stats.monthStudied": "この月は{n}日勉強しました",
  "stats.date": "{month}月{day}日", // {date} in stats.dayDetail
  "stats.dayDetail": "{date}：{n}レビュー", // shown when a day is tapped
  "stats.chartMonthTitle": "レビュー数", // followed by the month name
  "stats.monthReviews": "この月のレビュー：{n}",
  "stats.less": "少ない", // calendar legend
  "stats.more": "多い",
  "stats.totalsTitle": "これまでの合計",
  "stats.totalReviews": "レビュー",
  "stats.totalDays": "勉強した日",
  "stats.totalSpelled": "スペル正解",
  "stats.totalBonus": "スペルボーナス",
  "stats.troubleTitle": "苦手な単語",
  "stats.troubleNote": "最近30日で「まだ」「わからない」が多かった単語",
  "stats.troubleCount": "{n}回", // how many times the word was missed
  "stats.troubleEmpty": "苦手な単語はありません。すごい！",
  "stats.empty": "まだ記録がありません。My Cardsで復習すると、ここに記録が出ます。",

  // 答え方 switch (My Cards and settings): how Japanese → English cards are answered
  "answerMode.title": "答え方（日本語 → English）",
  "answerMode.label": "答え方", // read aloud for the switch
  "answerMode.off": "なし", // answer with the buttons (no typing)
  "answerMode.off.note": "答えを見て、わかった / まだ で答えます",
  "answerMode.typing": "タイピング",
  "answerMode.typing.note": "英語をタイプして答えます。正しいスペルで +1 pt",
  "answerMode.handwriting": "手書き",
  "answerMode.handwriting.note": "Apple Pencil で英語を書いて答えます。正しく書けたら +1 pt",

  // Review and Card Sets drill: the study card and the answer area
  "review.questionEn2jp": "この単語は日本語で何と言いますか？",
  "review.questionJp2en": "この単語は英語で何と言いますか？",
  "review.progress": "覚えた: {cleared} ・ 残り: {left}", // top right: cards done and cards left
  "review.defaultName": "復習 (Review)", // review title when it isn't one deck
  "review.tapToFlip": "タップしてめくる", // pulsing hint on the front of the card
  "review.answerPill": "答え", // small label on the back of the card
  "review.levelChip": "Lv {n}", // the card's level, top right of the card
  "review.levelUp": "Lv {n}!", // floats up after a correct answer
  "review.levelUpMastered": "Mastered!", // floats up when a Lv7 card becomes Mastered
  "review.showAnswer": "答えを見る",
  "review.notYet.en": "Still learning", // English line of the "not yet" answer button
  "review.notYet.ja": "まだ", // Japanese line of the same button (under the English, in Japanese mode)
  "review.gotIt.en": "I knew it", // English line of the "I knew it" answer button
  "review.gotIt.ja": "わかった", // Japanese line of the same button
  "review.notYetNote": "まだでも大丈夫！すぐにまた出てきます", // under the two answer buttons
  "review.typingLabel": "英語で答えを入力", // read aloud for the typing box
  "review.typingPlaceholder": "English", // gray text in the empty typing box
  "review.otherMeaning": "それも正しい意味ですが、この単語ではありません。もう一度！", // typed another word with the same meaning; one more try
  "review.dontKnow": "わからない",
  "review.checking": "確認中…", // while checking a typed answer
  "review.submit": "答える",
  "review.correct": "✓ 正解！", // typed with the right spelling
  "review.close": "おしい！", // typed one letter off
  "review.yourAnswer": "あなたの答え: {answer}",
  "review.rightAnswer": "正しい答え: {answer}",
  "review.textbookAnswer": "教科書の答え: {answer}", // an alternate answer was accepted
  "review.spellBonus": "+1 スペル", // floats up: one bonus point for the right spelling
  "review.next": "次へ",
  "review.previousCard": "前のカード", // label of the chip showing the last card's answer
  "review.undo": "元に戻す", // button on that chip: takes back the last まだ / わかった
  "review.undoAria": "前のカードの答えを元に戻す", // aria-label of that button
  "review.allCleared": "全部クリアしました！", // end of a review or drill
  "review.backToDashboard": "ダッシュボードに戻る",

  // 手書き answer mode (Apple Pencil) in reviews
  "handwriting.hint": "Apple Pencil で、1マスに1文字ずつ書いてください",
  "handwriting.boxLabel": "{n}文字目", // read aloud for each letter box: "letter number {n}"
  "handwriting.clear": "消す", // erase the selected box
  "handwriting.undo": "戻す", // undo the last stroke
  "handwriting.submit": "こたえる",
  "handwriting.reading": "読み取り中…", // while the app reads the handwriting
  "handwriting.read": "読み取り: {answer}", // what the app read in the boxes
  "handwriting.lenient": "「{target}」が「{read}」に見えるかも。気をつけて書こう！", // e.g. the i looks like an l
  "handwriting.unavailable": "手書きの準備ができませんでした。今回はタイピングで答えてください。",

  // Back of the card: example sentence and dictionary link
  "wordInfo.example": "例文",
  "wordInfo.dictionary": "辞書で調べる",

  // Mastered list (opened from the Mastered button on My Cards)
  "mastered.restore": "復習に戻す", // put a Mastered card back into reviews
  "mastered.restoreConfirm": "復習に戻しますか？",
  "mastered.restoreYes": "戻す",
  "mastered.empty": "まだマスターしたカードはありません",

  // Review plan pop-up (tap the review button when nothing is due)
  "reviewPlan.title": "復習の予定",
  "reviewPlan.today": "今日",
  "reviewPlan.tomorrow": "明日",
  "reviewPlan.todayEmpty": "今日はもう復習はありません",
  "reviewPlan.tomorrowEmpty": "明日の復習はありません",
  "reviewPlan.total": "合計 {n}枚", // cards that day
  "reviewPlan.hourCount": "+{n}枚", // cards coming due in that hour
  "reviewPlan.runningTotal": "計{n}枚", // cards waiting by that hour, counted from now

  // Card Sets tab: hub, textbook / unit / deck lists, add-to-My-Cards
  "cardSets.title": "Card Sets",
  "cardSets.titleJa": "カードセット", // small Japanese line next to the title
  "cardSets.hubIntro": "学びたいセットをえらんで、マイカードに追加しよう。",
  "cardSets.textbooks": "Textbooks",
  "cardSets.textbooksLabel": "教科書から探す",
  "cardSets.textbooksNote": "New Horizon や Power On の ユニット・パートごとのセット",
  "cardSets.tests": "Tests & Themes",
  "cardSets.testsLabel": "テスト・テーマ別",
  "cardSets.testsNote": "英検などのテスト対策や、テーマ別の単語セット",
  "cardSets.comingSoon": "準備中 — Coming soon",
  "cardSets.comingSoonNote": "英検などのセットは、もうすぐ追加されます。",
  "cardSets.back": "← {label}", // back button; {label} = the screen it goes back to (Card Sets, Textbooks, or a textbook name)
  "cardSets.loading": "ライブラリを読み込み中…",
  "cardSets.levelSwitchLabel": "School level", // read aloud for the 中学 / 高校 switch
  "cardSets.levelJHS": "中学 · JHS",
  "cardSets.levelHS": "高校 · HS",
  "cardSets.levelOther": "その他",
  "cardSets.noTextbooks": "まだ教科書がありません。",
  "cardSets.noUnits": "まだユニットがありません。",
  "cardSets.noDecks": "まだデッキがありません。",
  "cardSets.unitCount": "{n} ユニット",
  "cardSets.deckCount": "{n} デッキ",
  "cardSets.wordCount": "{n}語",
  "cardSets.addedBadge": "追加済み", // pill on a deck already in My Cards
  "cardSets.add": "＋ マイカードに追加 (Add to My Cards)",
  "cardSets.adding": "追加中...",
  "cardSets.added": "✓ マイカードに追加済み (Added to My Cards)",
  "cardSets.deckEmpty": "このデッキにはまだカードがありません。", // browser alert
  "cardSets.signInToAdd": "マイカードに追加するには、ログインしてください。", // browser alert

  // Word list of a Card Sets deck (before the drill)
  "wordList.wordCount": "{n}語",
  "wordList.hideSwitch": "日本語をかくす", // switch that covers the Japanese words
  "wordList.tapToShow": "タップで表示", // on a covered Japanese word
  "wordList.showWord": "日本語を見る: {word}", // read aloud; {word} = the English word
  "wordList.hideWord": "日本語をかくす: {word}", // read aloud; {word} = the English word
  "wordList.startDrill": "ドリルを始める (Start drill)",

  // Gacha screen and the pull result
  "gacha.title": "ガチャ",
  "gacha.collectionLink": "アバター図鑑 {owned} / {total} →", // link to the collection: avatars owned / all avatars
  "gacha.tickets": "ガチャ券",
  "gacha.ticketCount": "× {n}",
  "gacha.pull": "ガチャを回す",
  "gacha.pulling": "回しています…",
  "gacha.noTicketsNote": "ガチャ券がありません。レビューをしてガチャ券をもらおう！",
  "gacha.ticketTomorrow": "今日のガチャ券はゲット！ 次の券は明日もらえます", // today's review ticket is already earned
  "gacha.toNextTicket": "次のガチャ券まで あと {n} レビュー",
  "gacha.perTicket": "{n} レビューごとに 1枚（1日1枚まで）", // one ticket per {n} reviews, at most one a day
  "gacha.odds": "出る確率", // heading of the chance boxes
  "gacha.percent": "{n}%",
  "gacha.noRepeats": "同じアバターは出ません。毎回新しいアバター！",
  "gacha.result": "ガチャの結果", // read aloud for the result pop-up
  "gacha.tapToSkip": "タップでスキップ", // under the capsule animation
  "gacha.new": "NEW!",
  "gacha.avatar": "アバター", // small label above the avatar's name
  "gacha.avatarFallback": "アバター", // read aloud for an avatar picture with no name
  "gacha.starterAvatarLabel": "アバター (Avatar)", // read aloud for the starter cat picture
  "gacha.equip": "つける", // wear this avatar
  "gacha.equipping": "つけています…",
  "gacha.wearing": "つけ中", // this avatar is being worn
  "gacha.again": "もう一回 {left}", // pull again; {left} = gacha.ticketsLeft, in small text
  "gacha.ticketsLeft": "(のこり 券 {n}枚)",
  "gacha.close": "とじる",

  // Avatar collection (アバター図鑑)
  "collection.back": "← ガチャ",
  "collection.backToDashboard": "← 戻る", // back button when the collection was opened from the player card
  "collection.title": "アバター図鑑",
  "collection.wornAvatar": "つけ中のアバター", // heading of the summary panel
  "collection.notOwned": "まだ持っていないアバター", // read aloud for a dark silhouette tile
  "collection.silhouetteLabel": "？", // read aloud for a silhouette picture
  "collection.wornLabel": "{nameJa} ({nameEn}) つけ中", // read aloud for the avatar being worn
  "collection.equipLabel": "{nameJa} ({nameEn}) をつける", // read aloud for an owned avatar: tap to wear it

  // Rarity names (gacha screen, result, collection)
  "rarity.normal": "ノーマル",
  "rarity.rare": "レア",
  "rarity.superRare": "スーパーレア",
  "rarity.secret": "シークレット",

  // Settings screen (設定)
  "settings.back": "← 戻る",
  "settings.title": "設定",
  "settings.themes": "テーマ",
  "settings.themesFailed": "テーマを読み込めませんでした",
  "settings.themeLocked": "ランク {n} になると使えます", // after tapping a locked theme
  "settings.study": "学習", // section with session size and 答え方
  "settings.sessionSize": "1回の枚数", // how many cards one review has
  "settings.sessionSizeOption": "{n}枚", // the 10 / 20 / 30 choices
  "settings.sessionSizeNote": "1回の復習で出てくるカードの数",
  "settings.display": "表示", // section with reduce motion
  "settings.reduceMotion": "カードの動きを減らす",
  "settings.reduceMotionNote": "カードをめくる動きやキラキラを止めます",
  "settings.language": "言語 / Language", // same text in every language, so a student can always find the way back
  "settings.languageJa": "日本語", // same text in every language
  "settings.languageEn": "English", // same text in every language

  // Themes: status lines on the tiles, the small preview, and the unlock pop-up
  "themes.fromStart": "はじめから", // available from the start
  "themes.unlockedAt": "ランク {n} で解放ずみ", // unlocked (at rank {n})
  "themes.unlocksAt": "ランク {n} で解放", // still locked: unlocks at rank {n}
  "themes.tileLabel": "{name}（{status}）", // read aloud for a tile; {status} = one of the three lines above
  "themes.previewLabel": "{name} のプレビュー", // read aloud for a theme picture
  "themes.previewRank": "ランク", // inside the tiny preview picture
  "themes.previewNotYet": "まだ", // inside the tiny preview picture
  "themes.previewGotIt": "わかった", // inside the tiny preview picture
  "themes.rankReached": "ランク {n} 達成！",
  "themes.newTheme": "新しいテーマ「{name}」が解放されました",
  "themes.others": "ほかにも {n} つのテーマが解放されています",
  "themes.useNow": "今すぐ使う",
  "themes.saving": "保存中…",
  "themes.later": "あとで",

  // "What is Polycards?" pop-up (button at the top of My Cards; also 使い方 in the account menu)
  "about.button": "What is Polycards?",
  "about.buttonLabel": "What is Polycards? / ポリカードのしくみ", // read aloud for the button
  "about.title": "What is Polycards?",
  "about.subtitle": "ポリカードのしくみ",
  "about.forgetting.heading": "Forgetting is normal",
  "about.forgetting.p1": "新しく覚えた単語は、何もしないと数日でほとんど忘れてしまいます。これは「忘却曲線」と言って、だれにでも起こることです。でも、忘れそうになったときにもう一度思い出すと、記憶は前よりずっと長く残ります。",
  "about.ladder.heading": "The level ladder",
  "about.ladder.before": "「わかった」を押すと、カードは1段上がり、次に出てくるまでの時間がのびます。", // above the level chips
  "about.ladder.after": "「まだ」を押すと、カードは少し下がって、早めにまた出てきます。まちがえても大丈夫。思い出そうとすること自体が勉強です。", // below the level chips
  "about.ladderLabel": "レベルと次の復習まで", // read aloud for the row of level chips
  "about.ladderLevel": "Lv{n}", // one level chip (followed by its wait, a time.wait* text)
  "about.ladderMastered": "Mastered!", // last chip
  "about.science.heading": "The science",
  "about.science.p1": "Polycardsは、研究で効果が確かめられている2つの方法を使っています。",
  "about.science.spaced": "Spaced repetition（間隔反復）：時間をあけて何回か復習する。一度にたくさんやるより、よく覚えられます。",
  "about.science.retrieval": "Retrieval practice（思い出す練習）：答えを見る前に、頭の中で思い出す。ただ読むだけより、記憶に残ります。",
  "about.why.heading": "Why it helps you",
  "about.why.1": "覚えている単語には時間を使わず、忘れそうな単語だけ復習できる",
  "about.why.2": "1回は{sessionSize}枚まで。毎日少しずつでOK", // {sessionSize} = the student's 1回の枚数 (10, 20 or 30)
  "about.why.3": "テストのあとも、ずっと覚えていられる",
  "about.tips.heading": "Tips",
  "about.tips.1": "毎日少しずつやろう（まとめてやるより効果的）",
  "about.tips.2": "答えを見る前に、本気で思い出そう",
  "about.tips.3": "正直に「わかった」「まだ」を押そう。うそをつくと、自分が覚えられなくなるだけです",
  "about.tips.4": "English → 日本語 と 日本語 → English は別のカードです",

  // Times and dates (Japan time): the 次の復習 line and the level ladder
  "time.minutesLater": "{n}分後", // in {n} minutes
  "time.hoursLater": "{n}時間後", // in {n} hours
  "time.monthDay": "{month}月{day}日", // a date like 10月15日; {month} is 1–12
  "time.waitHours": "{n}時間", // how long a level waits: {n} hours
  "time.waitDays": "{n}日", // {n} days
  "time.waitOneWeek": "1週間",
  "time.waitTwoWeeks": "2週間",
  "time.waitMonths": "{n}か月", // {n} months

  // Error messages (pop-ups and red text)
  "errors.saveFailed": "保存できませんでした", // a review answer couldn't be saved
  "errors.cardNotFound": "このカードは見つかりませんでした",
  "errors.notSignedIn": "ログインしてください",
  "errors.noTickets": "ガチャ券がありません",
  "errors.collectionComplete": "全部そろいました！新しいアバターをお楽しみに", // the student has every avatar
  "errors.notOwned": "このアバターはまだ持っていません",
  "errors.themeLocked": "このテーマはまだ使えません",
  "errors.gachaFailed": "ガチャを読み込めませんでした ({detail})", // {detail} = the technical error, in English
};
