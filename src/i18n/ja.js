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
  "common.backToDashboard": "マイデッキにもどる", // back button above the Mastered list, the word list and the review

  // Header at the top of every screen: logo button and gacha button (read aloud only)
  "header.home": "マイデッキ", // the Polycards logo, which goes back to My Cards
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
  "tabs.myCards": "マイデッキ",
  "tabs.cardSets": "単語パック",
  "tabs.training": "トレーニング",

  // My Cards dashboard: review button and マイデッキ list
  "myCards.startReview": "復習を始める",
  "myCards.dueTotal": "全{n}枚の復習があります", // under 復習を始める when more cards are due than one review holds
  "myCards.sessionCount": "{n}枚", // pill on the review button: cards in this review
  "myCards.nothingDue": "復習するカードはありません",
  "myCards.nextReview": "次の復習：{when}に {n}枚", // {when} is a time.* text, e.g. 2時間後 / 10月15日
  "myCards.nothingDueAlert": "今は復習するカードがありません。", // browser alert
  "myCards.mastered": "Mastered {n}", // button that opens the Mastered list; {n} = number of Mastered cards
  "myCards.myDecks": "追加したパック", // heading of the student's decks
  "myCards.deckDue": "復習 {n}枚", // pill on a deck row: due cards in that deck
  "myCards.deckNothingDue": "今は復習なし",
  "myCards.remove": "削除 (Remove)", // the × on a deck row
  "myCards.removing": "削除中...",
  "myCards.removeConfirm": "「{name}」をマイデッキから削除しますか？このデッキの復習の記録は消えます。", // browser confirm; {name} = deck name
  "myCards.empty.heading": "まだデッキがありません", // shown when no decks are added yet
  "myCards.empty.body": "「単語パック」タブで教科書のユニットを選んで、「＋ マイデッキに追加」を押しましょう。追加したカードはここで復習できます。",
  "myCards.empty.button": "単語パックを見る", // button that opens the Card Sets tab

  // Player card and level chart on My Cards
  "stats.rankLabel": "ランク", // small label above the big "Rank N"
  "stats.rank": "Rank {n}",
  "stats.points": "{n} EXP",
  "stats.spellingBonus": "スペルボーナス {n} EXP", // points earned by correct spelling in typing mode
  "stats.openCollection": "ポリアバター図鑑を開く", // aria-label of the avatar on the player card
  "stats.toNextRank": "次のランクまで",
  "stats.toNextRankLeft": "あと{value}", // {value} = stats.toNextRankValue, in bold
  "stats.toNextRankValue": "{n} EXP → Rank {rank}", // points still needed, then the next rank
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
  "stats.totalMastered": "マスターしたカード",
  "stats.troubleTitle": "苦手な単語",
  "stats.troubleNote": "最近30日で「まだ」「わからない」が多かった単語",
  "stats.troubleCount": "{n}回", // how many times the word was missed
  "stats.troubleEmpty": "苦手な単語はありません。すごい！",
  "stats.empty": "まだ記録がありません。マイデッキで復習すると、ここに記録が出ます。",

  // 答え方 switch (My Cards and settings): how Japanese → English cards are answered
  "answerMode.title": "答え方（日本語 → English）",
  "answerMode.label": "答え方", // read aloud for the switch
  "answerMode.tap": "タップ", // answer with the buttons (tap 答えを見る, then まだ / わかった)
  "answerMode.tap.note": "答えを見て、わかった / まだ で答えます",
  "answerMode.typing": "タイピング",
  "answerMode.typing.note": "英語をタイプして答えます。正しいスペルで +1 EXP",
  "answerMode.handwriting": "手書き",
  "answerMode.handwriting.note": "Apple Pencil で英語を書いて答えます。正しく書けたら +1 EXP",

  // Review and Card Sets drill: the study card and the answer area
  "review.questionEn2jp": "この単語は日本語で何と言いますか？",
  "review.questionJp2en": "この単語は英語で何と言いますか？",
  "review.progress": "覚えた: {cleared} ・ 残り: {left}", // top right: cards done and cards left
  "review.defaultName": "復習", // review title when it isn't one deck
  "review.tapToFlip": "タップしてめくる", // pulsing hint on the front of the card
  "speech.listen": "発音を聞く", // aria-label of the speaker button (cards and word list)
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
  "review.spellBonus": "スペル +1 EXP", // floats up: one bonus point for the right spelling
  "review.next": "次へ",
  "review.previousCard": "前のカード", // label of the chip showing the last card's answer
  "review.undo": "元に戻す", // button on that chip: takes back the last まだ / わかった
  "review.undoAria": "前のカードの答えを元に戻す", // aria-label of that button
  "review.allCleared": "全部クリアしました！", // end of a review or drill
  "review.backToDashboard": "マイデッキにもどる",

  // 手書き answer mode (Apple Pencil) in reviews
  "handwriting.hint": "Apple Pencil で、1マスに1文字ずつ書いてください",
  "handwriting.boxLabel": "{n}文字目", // read aloud for each letter box: "letter number {n}"
  "handwriting.clear": "消す", // erase the selected box
  "handwriting.undo": "戻す", // undo the last stroke
  "handwriting.submit": "こたえる",
  "handwriting.reading": "読み取り中…", // while the app reads the handwriting
  "handwriting.loading": "準備中…", // the letter boxes wait until the letter model is ready
  "handwriting.read": "読み取り: {answer}", // what the app read in the boxes
  "handwriting.lenient": "「{target}」が「{read}」に見えるかも。気をつけて書こう！", // e.g. the i looks like an l
  "handwriting.unavailable": "手書きの準備ができませんでした。今回はタイピングで答えてください。",

  // Letter practice (れんしゅう？ under a red / orange box after a handwriting answer)
  "practice.chip": "れんしゅう？",
  "practice.chipAria": "「{letter}」をれんしゅうする",
  "practice.title": "「{letter}」をれんしゅうしよう",
  "practice.caseSwitch": "大文字・小文字", // B ⇄ b switch (aria-label)
  "practice.guideAria": "「{letter}」の書き順",
  "practice.replay": "もう一度見る", // play the stroke order again
  "practice.boxLabel": "れんしゅう {n}マス目",
  "practice.clear": "消す",
  "practice.close": "とじる",
  "practice.loading": "準備中…",
  "practice.unavailable": "手書きの準備ができませんでした",
  "practice.done": "できた！", // all 4 boxes green
  "practice.again": "もう一回",
  "practice.nextLetter": "次の文字へ", // Training tab only: go on to the next letter

  // Training tab (トレーニング)
  "training.title": "トレーニング",
  "training.abc.title": "ABCを書こう",
  "training.abc.description": "アルファベットを4線に書く練習", // DRAFT
  "training.abc.pencil": "Apple Pencil で書こう", // DRAFT
  "training.abc.capitals": "大文字",
  "training.abc.small": "小文字",
  "training.abc.doneCount": "{n} / 26 できた", // DRAFT: letters completed this visit
  "training.abc.doneAria": "{letter}（できた）", // read aloud for a completed letter
  "training.prev": "前の文字",
  "training.next": "次の文字",
  "practice.hint.shape": "お手本をよく見て、もう一度書いてみよう",
  "practice.hint.ascender": "{letter} のたて線は、いちばん上の線までのばそう",
  "practice.hint.tail": "下の線までのばそう",
  "practice.hint.small": "小文字の {letter} は2本目と3本目の線のあいだに書こう",
  "practice.hint.capital": "大文字は上の線から3本目の線までの高さで書こう",
  "practice.hint.baseline": "赤い線の上にのせよう",
  "practice.hint.capitalI": "大文字の I は上と下に短い横線を書こう",
  "practice.hint.dot": "{letter} の点をわすれずに、2本目の線より上に書こう",
  "practice.hint.erase": "書き直すときは「消す」をおしてね", // under every hint
  "practice.hint.retry": "もう一度書いてね", // a box that couldn't be read (slow or failed)
  // One line per stroke under the stroke-order guide
  "practice.stroke.down": "上から下へまっすぐ",
  "practice.stroke.across": "左から右へまっすぐ",
  "practice.stroke.barTop": "上の線に短い横線",
  "practice.stroke.barBottom": "赤い線に短い横線",
  "practice.stroke.slantDownLeft": "左下へななめに",
  "practice.stroke.slantDownRight": "右下へななめに",
  "practice.stroke.slantUpRight": "右上へななめに",
  "practice.stroke.bumps": "右に2つふくらませる",
  "practice.stroke.bowlRight": "右に大きくふくらませる",
  "practice.stroke.bowlThenLeg": "右にふくらませて、右下へ",
  "practice.stroke.cLeft": "右上から左回りに",
  "practice.stroke.circleLeft": "上から左回りにひと回り",
  "practice.stroke.gShape": "左回りに書いて、内側へ横線",
  "practice.stroke.downHookLeft": "下へおりて、左へまげる",
  "practice.stroke.downThenRight": "下へおりて、右へ",
  "practice.stroke.uShape": "下へおりて、丸く右へ上がる",
  "practice.stroke.vee": "右下へおりて、右上へ上がる",
  "practice.stroke.doubleVee": "下・上・下・上とつづけて",
  "practice.stroke.zShape": "右へ、左下へ、右へ",
  "practice.stroke.sShape": "右上からSの形に",
  "practice.stroke.circleThenDown": "左回りに丸く書いて、下へまっすぐ",
  "practice.stroke.circleThenUpDown": "左回りに丸く書いて、上まで上がり、下へ",
  "practice.stroke.circleThenHook": "左回りに丸く書いて、下へおりて左へまげる",
  "practice.stroke.downThenRound": "下へおりて、もどって右に丸く",
  "practice.stroke.eShape": "右へ横線、そのまま左回りに",
  "practice.stroke.hookDown": "右上から曲がって、下へ",
  "practice.stroke.dot": "点を打つ",
  "practice.stroke.angle": "左へななめにおりて、右下へ",
  "practice.stroke.downThenHump": "下へおりて、もどって山を1つ",
  "practice.stroke.downThenTwoHumps": "下へおりて、もどって山を2つ",
  "practice.stroke.downThenShoulder": "下へおりて、もどって右へ少し",
  "practice.stroke.downCurveRight": "下へおりて、右へ曲げる",
  "practice.stroke.uThenDown": "下へおりて丸く上がり、まっすぐ下へ",

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
  "cardSets.title": "Word Packs",
  "cardSets.titleJa": "単語パック", // small Japanese line next to the title
  "cardSets.hubIntro": "教科書パックは授業で習う単語、セレクトパックはテーマ別の単語です。パックを開いて単語を見てから、マイデッキに追加しよう！",
  "cardSets.textbooks": "Textbook Packs",
  "cardSets.textbooksLabel": "教科書パック",
  "cardSets.textbooksNote": "教科書のユニットごとにまとめた単語セット",
  "cardSets.tests": "Select Packs",
  "cardSets.testsLabel": "セレクトパック",
  "cardSets.testsNote": "テーマや目的別の単語セット",
  "cardSets.comingSoon": "準備中 — Coming soon",
  "cardSets.comingSoonNote": "英検などのセットは、もうすぐ追加されます。",
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
  "cardSets.add": "＋ マイデッキに追加",
  "cardSets.addCounts": "＋ マイデッキに追加（新しい単語 {new} · 所持済み {owned}）", // when some words are already owned (words, not cards)
  "cardSets.addAllOwned": "＋ マイデッキに追加（ぜんぶ所持済み）", // when every word is already owned
  "cardSets.adding": "追加中...",
  "cardSets.added": "✓ マイデッキに追加済み",
  "cardSets.deckEmpty": "このデッキにはまだカードがありません。", // browser alert
  "cardSets.signInToAdd": "マイデッキに追加するには、ログインしてください。", // browser alert

  // Pack opening after Add to My Cards (PackOpening.jsx). Counts are words, not cards.
  "pack.dialog": "パックを開けています", // read aloud for the pop-up
  "pack.tapToSkip": "タップでスキップ",
  "pack.owned": "所持済み", // on a grayed card the student already has
  "pack.more": "ほか {n}語", // under the fan when the pack has more words than are shown
  "pack.deckLabel": "マイデッキ", // under the deck the new cards fly into
  "pack.addedLine": "{n}語をマイデッキに追加しました！",
  "pack.addedPlain": "マイデッキに追加しました！", // when the owned check failed
  "pack.ownedLine": "{n}語はもう持っているので、追加しませんでした。今までの進み具合はそのままです。",
  "pack.ownedList": "もう持っている単語",
  "pack.allOwned": "このパックの単語は、ぜんぶもう持っています！",
  "pack.allOwnedNote": "同じ単語が2回追加されることはありません。",
  "pack.close": "OK",

  // Word list of a Card Sets deck (before the drill)
  "wordList.wordCount": "{n}語",
  "wordList.hideSwitch": "日本語をかくす", // switch that covers the Japanese words
  "wordList.tapToShow": "タップで表示", // on a covered Japanese word
  "wordList.showWord": "日本語を見る: {word}", // read aloud; {word} = the English word
  "wordList.hideWord": "日本語をかくす: {word}", // read aloud; {word} = the English word
  "wordList.owned": "所持済み", // small tag on a word the student already has (only before the deck is added)
  "wordList.startDrill": "ドリルを始める (Start drill)",

  // Gacha screen and the pull result
  "gacha.title": "ガチャ",
  "gacha.collectionLink": "ポリアバター図鑑 {owned} / {total} →", // link to the collection: avatars owned / all avatars
  "gacha.tickets": "ガチャ券",
  "gacha.ticketCount": "× {n}",
  "gacha.pull": "ガチャを回す",
  "gacha.pulling": "回しています…",
  "gacha.noTicketsNote": "ガチャ券がありません。レビューをしてガチャ券をもらおう！",
  "gacha.ticketTomorrow": "今日のガチャ券はゲット！ 次の券は明日もらえます", // today's review ticket is already earned
  "gacha.toNextTicket": "次のガチャ券まで あと {n} レビュー",
  "gacha.perTicket": "{n} レビューごとに 1枚（1日1枚まで）", // one ticket per {n} reviews, at most one a day
  "gacha.spellToNext": "スペルのガチャ券まで あと {n} EXP",
  "gacha.spellPerTicket": "スペルボーナス {n} EXPごとに 1枚", // spelling tickets have no daily cap
  "gacha.odds": "出る確率", // heading of the chance boxes
  "gacha.percent": "{n}%",
  "gacha.noRepeats": "同じポリアバターは出ません。毎回新しいポリアバター！",
  "gacha.result": "ガチャの結果", // read aloud for the result pop-up
  "gacha.tapToSkip": "タップでスキップ", // under the capsule animation
  "gacha.new": "NEW!",
  "gacha.avatar": "ポリアバター", // small label above the avatar's name
  "gacha.avatarFallback": "ポリアバター", // read aloud for an avatar picture with no name
  "gacha.starterAvatarLabel": "ポリアバター (Polyavatar)", // read aloud for the starter cat picture
  "gacha.equip": "つける", // wear this avatar
  "gacha.equipping": "つけています…",
  "gacha.wearing": "つけ中", // this avatar is being worn
  "gacha.again": "もう一回 {left}", // pull again; {left} = gacha.ticketsLeft, in small text
  "gacha.ticketsLeft": "(のこり 券 {n}枚)",
  "gacha.close": "とじる",

  // Avatar collection (ポリアバター図鑑)
  "collection.back": "ガチャ",
  "collection.backToDashboard": "戻る", // back button when the collection was opened from the player card
  "collection.title": "ポリアバター図鑑",
  "collection.wornAvatar": "つけ中のポリアバター", // heading of the summary panel
  "collection.notOwned": "まだ持っていないポリアバター", // read aloud for a dark silhouette tile
  "collection.silhouetteLabel": "？", // read aloud for a silhouette picture
  "collection.wornLabel": "{nameJa} ({nameEn}) つけ中", // read aloud for the avatar being worn
  "collection.equipLabel": "{nameJa} ({nameEn}) をつける", // read aloud for an owned avatar: tap to wear it

  // Rarity names (gacha screen, result, collection)
  "rarity.normal": "ノーマル",
  "rarity.rare": "レア",
  "rarity.superRare": "スーパーレア",
  "rarity.secret": "シークレット",

  // Settings screen (設定)
  "settings.back": "戻る",
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
  "settings.speech": "発音", // section with auto-play and slow speech
  "settings.autoPlay": "自動再生",
  "settings.autoPlayNote": "英語が出たときに自動で読み上げます",
  "settings.slowSpeech": "ゆっくり",
  "settings.slowSpeechNote": "ゆっくり読み上げます",
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
  "about.button": "Polycardsとは？",
  "about.buttonLabel": "Polycardsとは？", // read aloud for the button
  "about.title": "Polycardsとは？",
  "about.subtitle": "ポリカードのしくみ",
  "about.forgetting.heading": "忘れるのはふつうのこと",
  "about.forgetting.p1": "新しく覚えた単語は、何もしないと数日でほとんど忘れてしまいます。これは「忘却曲線」と言って、だれにでも起こることです。でも、忘れそうになったときにもう一度思い出すと、記憶は前よりずっと長く残ります。",
  "about.ladder.heading": "レベルのしくみ",
  "about.ladder.before": "「わかった」を押すと、カードは1段上がり、次に出てくるまでの時間がのびます。", // above the level chips
  "about.ladder.after": "「まだ」を押すと、カードは少し下がって、早めにまた出てきます。まちがえても大丈夫。思い出そうとすること自体が勉強です。", // below the level chips
  "about.ladderLabel": "レベルと次の復習まで", // read aloud for the row of level chips
  "about.ladderLevel": "Lv{n}", // one level chip (followed by its wait, a time.wait* text)
  "about.ladderMastered": "Mastered!", // last chip
  "about.science.heading": "研究でわかっていること",
  "about.science.p1": "Polycardsは、研究で効果が確かめられている2つの方法を使っています。",
  "about.science.spaced": "時間をあけて復習する（Spaced repetition）：時間をあけて何回か復習する。一度にたくさんやるより、よく覚えられます。",
  "about.science.retrieval": "思い出す練習（Retrieval practice）：答えを見る前に、頭の中で思い出す。ただ読むだけより、記憶に残ります。",
  "about.why.heading": "どうして役に立つの？",
  "about.why.1": "覚えている単語には時間を使わず、忘れそうな単語だけ復習できる",
  "about.why.2": "1回は{sessionSize}枚まで。毎日少しずつでOK", // {sessionSize} = the student's 1回の枚数 (10, 20 or 30)
  "about.why.3": "テストのあとも、ずっと覚えていられる",
  // The numbers in about.write.1 (150 EXP) and about.gacha.p1 (100レビュー, 1日1枚) are typed by hand.
  // Update them here and in en.js if gacha_setting('spelling_points_per_ticket') or
  // gacha_setting('reviews_per_ticket') (or the daily cap) changes in Supabase.
  "about.write.heading": "書いて答えよう",
  "about.write.p1": "設定で「手書き」にすると、Apple Pencil で英語を書いて答えられます。",
  "about.write.1": "正しく書けたら +1 EXP！150 EXP ごとにガチャ券が1枚もらえます", // 150 = spelling_points_per_ticket
  "about.write.2": "「れんしゅう？」を押すと、その文字を練習できます",
  "about.training.heading": "トレーニング",
  "about.training.p1": "「トレーニング」タブで、アルファベットの書き方を練習できます。練習はこれから増えていきます。",
  "about.gacha.heading": "ガチャとポリアバター",
  "about.gacha.p1": "100レビューごとにガチャ券が1枚もらえます（1日1枚まで）。ガチャを回して、ポリアバターを集めよう！「わかった」でも「まだ」でも同じなので、正直に答えよう。", // 100 = reviews_per_ticket
  "about.tips.heading": "上手に使うコツ",
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
  "errors.collectionComplete": "全部そろいました！新しいポリアバターをお楽しみに", // the student has every avatar
  "errors.notOwned": "このポリアバターはまだ持っていません",
  "errors.themeLocked": "このテーマはまだ使えません",
  "errors.gachaFailed": "ガチャを読み込めませんでした ({detail})", // {detail} = the technical error, in English

  // Parts of speech (品詞): the chip on cards / word list / Mastered list and its pop-up (PosSheet.jsx).
  // label = the chip and the pop-up heading; other = the name in the other language, small after it.
  "pos.title": "品詞とは？",
  "pos.subtitle": "ことばのグループ分け",
  "pos.chipAria": "品詞：{label}（説明を見る）", // read aloud for the chip
  "pos.label.noun": "名詞",
  "pos.label.verb": "動詞",
  "pos.label.adjective": "形容詞",
  "pos.label.adverb": "副詞",
  "pos.label.preposition": "前置詞",
  "pos.label.pronoun": "代名詞",
  "pos.label.conjunction": "接続詞",
  "pos.label.auxiliary": "助動詞",
  "pos.label.article": "冠詞",
  "pos.label.interjection": "間投詞",
  "pos.label.number": "数詞",
  "pos.label.phrase": "表現",
  "pos.other.noun": "noun",
  "pos.other.verb": "verb",
  "pos.other.adjective": "adjective",
  "pos.other.adverb": "adverb",
  "pos.other.preposition": "preposition",
  "pos.other.pronoun": "pronoun",
  "pos.other.conjunction": "conjunction",
  "pos.other.auxiliary": "auxiliary verb",
  "pos.other.article": "article",
  "pos.other.interjection": "interjection",
  "pos.other.number": "number",
  "pos.other.phrase": "phrase",
  "pos.desc.noun": "人・もの・ことの名前を表すことば。",
  "pos.desc.verb": "「〜する」など、動きや状態を表すことば。",
  "pos.desc.adjective": "人やもののようすや性質を表すことば。",
  "pos.desc.adverb": "動詞や形容詞などをくわしく説明することば。",
  "pos.desc.preposition": "名詞の前に置いて、場所や時などを表すことば。",
  "pos.desc.pronoun": "名詞の代わりに使うことば。",
  "pos.desc.conjunction": "ことばとことば、文と文をつなぐことば。",
  "pos.desc.auxiliary": "動詞の前に置いて、意味をつけ加えることば。",
  "pos.desc.article": "名詞の前につける a / an / the のこと。",
  "pos.desc.interjection": "おどろきや気持ちを表すことば。",
  "pos.desc.number": "数や順番を表すことば。",
  "pos.desc.phrase": "2語以上で1つの意味になる言い方。",
};
