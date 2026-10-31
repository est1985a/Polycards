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
  "menu.joinClass": "クラスに参加", // opens the join-a-class pop-up
  "menu.settings": "設定",
  "menu.help": "使い方", // opens the "What is Polycards?" pop-up
  "menu.signOut": "ログアウト",
  "menu.signOutConfirm": "ログアウトしますか？",

  // Bottom tab bar
  "tabs.myCards": "マイデッキ",
  "tabs.cardSets": "単語パック",
  "tabs.training": "トレーニング",
  "tabs.class": "クラス",
  "tabs.teacher": "先生", // only for teacher accounts

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
  "review.continue": "続けて復習する（{n}枚）", // 全部クリア panel: starts the next set of the same review
  "review.moreDue": "いま復習できるカード：全{n}枚",
  "review.nothingMoreDue": "今は復習するカードはありません",

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

  // Back of the card: example sentence
  "wordInfo.example": "例文",

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
  "cardSets.goToMyDeck": "マイデッキへ ›", // word list's main button once the deck is added
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
  "pack.reviewNow": "今すぐ復習する", // main button: review this pack's new words now
  "pack.goToMyDeck": "マイデッキへ", // main button when every word was already owned
  "pack.later": "あとで", // closes the pop-up and stays on the pack

  // Word list of a Card Sets deck (before the drill)
  "wordList.wordCount": "{n}語",
  "wordList.hideSwitch": "日本語をかくす", // switch that covers the Japanese words
  "wordList.tapToShow": "タップで表示", // on a covered Japanese word
  "wordList.showWord": "日本語を見る: {word}", // read aloud; {word} = the English word
  "wordList.hideWord": "日本語をかくす: {word}", // read aloud; {word} = the English word
  "wordList.owned": "所持済み", // small tag on a word the student already has (only before the deck is added)
  "wordList.startDrill": "おためしドリル", // small button: the drill saves nothing, so it is only a try

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
  "collection.tapToEnlarge": "タップで大きく", // hint under the worn Polyavatar in the summary panel
  "collection.viewLarge": "{nameJa} ({nameEn}) を大きく見る", // read aloud for the worn Polyavatar: tap to see it large
  "collection.viewerLabel": "ポリアバターを大きく見る", // read aloud for the large-view pop-up
  "collection.obtainedOn": "入手日：{year}年{month}月{day}日", // date the Polyavatar was obtained (Japan time); {month} is 1–12

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
  "settings.classes": "クラス", // section listing the classes the student is in
  "settings.noClasses": "まだクラスに入っていません",
  "settings.classesFailed": "クラスを読み込めませんでした",
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
  "about.intro.p1": "英単語をカードで覚えるアプリです。パックを集めて、自分だけのデッキを育てよう！",
  "about.packs.heading": "パックを選ぶ",
  "about.packs.p1": "「単語パック」タブで単語のパックを選びます。教科書パックは教科書の単元ごと、セレクトパックはテーマや目的別の単語です。",
  "about.packs.p2": "パックを開いて「＋ マイデッキに追加」をタップ。もう持っている単語は「所持済み」になり、二重には入りません。",
  "about.review.heading": "マイデッキで復習",
  "about.review.before": "毎日「マイデッキ」で復習しよう。「わかった」を押すとカードのレベルが上がり、次に出てくるまでの時間がのびます。", // above the level chips
  "about.review.after": "「まだ」を押すとレベルが少し下がって、早めにまた出てきます。まちがえても大丈夫。思い出そうとすること自体が勉強です。", // below the level chips
  "about.ladderLabel": "レベルと次の復習まで", // read aloud for the row of level chips
  "about.ladderLevel": "Lv{n}", // one level chip (followed by its wait, a time.wait* text)
  "about.ladderMastered": "Mastered!", // last chip
  "about.honest.heading": "正直に答えよう",
  "about.honest.p1": "「わかった」「まだ」は正直に押そう。うそをついても得はしません。ガチャ券は、正解の数ではなく復習した回数でもらえます。",
  "about.modes.heading": "答え方を選ぶ",
  "about.modes.p1": "日本語 → English のカードは、答え方を選べます。マイデッキ、設定、復習の画面で切り替えられます（復習中もOK）。",
  "about.modes.tap": "タップ：答えを見て「わかった」「まだ」を押す",
  "about.modes.typing": "タイピング：英語をタイプして答える",
  "about.modes.handwriting": "手書き：Apple Pencil で英語を書いて答える（「れんしゅう？」で文字の練習もできます）",
  "about.modes.p2": "スペルが正しいとボーナス +1 EXP！🔊 をタップすると発音が聞けます。",
  "about.exp.heading": "EXPとランク",
  "about.exp.p1": "復習してカードのレベルが上がると、EXPがたまってランクが上がります。ランクは下がりません。",
  "about.exp.p2": "ランクが上がると、新しいテーマが使えるようになります（設定 → テーマで変更）。",
  // The numbers in about.tickets.p1 (100レビュー, 1日1枚, 150 EXP, ランク10ごと) are typed by hand.
  // Update them here and in en.js if gacha_setting('reviews_per_ticket') (or the daily cap),
  // gacha_setting('spelling_points_per_ticket') or the rank tickets change in Supabase.
  "about.tickets.heading": "ガチャ券とポリアバター",
  "about.tickets.p1": "ガチャ券は、100レビューごと（1日1枚まで）、スペルボーナス150 EXPごと、ランクが10上がるごとにもらえます。先生からもらえることもあります。ガチャを回して、ポリアバターを集めよう！",
  "about.training.heading": "トレーニング",
  "about.training.p1": "「トレーニング」タブで、アルファベットの書き方を練習できます。",
  "about.class.heading": "クラス",
  "about.class.p1": "メニューの「クラスに参加」で、先生から聞いた参加コードを入力すると、先生のクラスに入れます。",
  "about.class.p2": "「クラス」タブで、今週のクラスランキング（ニックネームで表示、月曜日にリセット）や、先生からの課題が見られます。",
  "about.stats.heading": "自分の記録",
  "about.stats.p1": "マイデッキの上にある、ランクとEXPのカードをタップすると、学習カレンダーや記録が見られます（メニューの「学習の記録」からも）。",
  "about.tips.heading": "上手に使うコツ",
  "about.tips.1": "毎日少しずつやろう。1回は{sessionSize}枚まで（設定で変えられます）", // {sessionSize} = the student's 1回の枚数 (10, 20 or 30)
  "about.tips.2": "答えを見る前に、本気で思い出そう",
  "about.tips.3": "English → 日本語 と 日本語 → English は別のカードです",
  "about.more.summary": "もっと詳しく", // the closed part at the bottom (forgetting curve, research)
  "about.forgetting.heading": "忘れるのはふつうのこと",
  "about.forgetting.p1": "新しく覚えた単語は、何もしないと数日でほとんど忘れてしまいます。これは「忘却曲線」と言って、だれにでも起こることです。でも、忘れそうになったときにもう一度思い出すと、記憶は前よりずっと長く残ります。",
  "about.science.heading": "研究でわかっていること",
  "about.science.p1": "Polycardsは、研究で効果が確かめられている2つの方法を使っています。",
  "about.science.spaced": "時間をあけて復習する（Spaced repetition）：時間をあけて何回か復習する。一度にたくさんやるより、よく覚えられます。",
  "about.science.retrieval": "思い出す練習（Retrieval practice）：答えを見る前に、頭の中で思い出す。ただ読むだけより、記憶に残ります。",

  // 先生用ガイド: below the student part of the pop-up, only for teacher accounts (src/content/teacherGuide.js).
  // Button names are quoted exactly as the teacher screens show them; update both if a label changes.
  "teacherGuide.title": "先生用ガイド",
  "teacherGuide.subtitle": "先生のアカウントだけに表示されます",
  "teacherGuide.open": "先生用ガイド", // pill on the teacher class list
  "teacherGuide.create.heading": "クラスを作って、生徒に参加してもらう",
  "teacherGuide.create.1": "「先生」タブ →「＋ クラスを作る」→ クラス名と年度を入れて「作る」。",
  "teacherGuide.create.2": "クラスを開くと参加コード（6文字）が出ます。「コピー」で配るか、「大きく表示」でプロジェクターに映します。",
  "teacherGuide.create.3": "生徒は、メニュー →「クラスに参加」→ コードを入力 → 本名・出席番号 → クラスでのニックネーム →「参加する」。（「クラス」タブの「＋ クラスに参加」からも参加できます。）",
  "teacherGuide.search.heading": "生徒を検索して追加する",
  "teacherGuide.search.1": "クラスを開いて「名簿」→「＋ 生徒を追加」。",
  "teacherGuide.search.2": "ユーザー名・名前・メールで検索します（2文字以上）。一度もログインしていない生徒は見つかりません。",
  "teacherGuide.search.3": "「選ぶ」→ 本名と出席番号を入れて「追加」。",
  "teacherGuide.roster.heading": "名簿：本名と出席番号",
  "teacherGuide.roster.p1": "「名簿」で生徒の「編集」をタップすると、本名・出席番号・ニックネームを直せます。「外す」でクラスから外せます。",
  "teacherGuide.roster.p2": "本名と出席番号は、そのクラスの先生だけが見られます。クラスメイトに見えるのはニックネームだけです。",
  "teacherGuide.roster.p3": "出席番号が同じ生徒がいると、番号の横に金色の「!」が出ます。",
  "teacherGuide.student.heading": "生徒の記録と「答え方のようす」",
  "teacherGuide.student.p1": "「名簿」か「一覧」で生徒の名前をタップすると、その生徒のページが開きます。ランク、レベル別のカード数、学習カレンダーなど、生徒本人の「学習の記録」と同じ内容です（学習量だけで、正答率は出ません）。",
  "teacherGuide.student.p2": "下の「答え方のようす」は、日本語 → English のカードの答え方を見るヒントです（30日間）。",
  "teacherGuide.honesty.gap": "タップで「わかった」を押した割合と、スペル正解の割合をくらべます。差が30ポイント以上だと「確認したほうがいいかも」と出ます。",
  "teacherGuide.honesty.speed": "めくってから1秒未満の「わかった」が50%以上でも、「確認したほうがいいかも」と出ます。",
  "teacherGuide.honesty.data": "それぞれ30回分の答えがたまるまでは「データ不足」です。",
  "teacherGuide.honesty.note": "これはヒントで、証拠ではありません。スペルは「わかる」より難しいので、少しの差はふつうです。気になるときは本人と話してみてください。",
  "teacherGuide.overview.heading": "一覧と、よく間違えた単語",
  "teacherGuide.overview.p1": "クラスを開いて「一覧」：生徒ごとの最終学習、レビュー数、学習日数、連続日数、ランクなどが見られます。7日間・30日間を切り替えられ、見出しをタップすると並べ替えられます。",
  "teacherGuide.overview.p2": "その期間に復習していない生徒には「未学習」、答え方を確認したほうがいい生徒には金色の旗が付きます。",
  "teacherGuide.overview.p3": "「よく間違えた単語」は、クラスで初めての答えが「まだ」「わからない」だった単語です。単語をタップすると間違えた生徒が見られ、「コピー」で単語リストをコピーできます（小テストの準備に）。",
  "teacherGuide.assign.heading": "課題（パックを出す）",
  "teacherGuide.assign.1": "クラスを開いて「課題」→「＋ 課題を出す」→ 単語パックを選ぶ。先生のマイデッキには追加されません。",
  "teacherGuide.assign.2": "期限とメモ（どちらもなくてもOK）を決めて「課題を出す」。",
  "teacherGuide.assign.3": "課題をタップすると、生徒ごとの状態が見られます：未追加・学習中（%）・完了。",
  "teacherGuide.assign.p1": "生徒の「クラス」タブに課題が出て、タブに点が付きます。生徒は ① マイデッキに追加 → ② マイデッキで復習 → ③ 完了 と進みます。「完了」は、すべてのカードに1回以上正解したという意味で、「覚えた」という意味ではありません。",
  "teacherGuide.award.heading": "ガチャ券を贈る",
  "teacherGuide.award.1": "「名簿」で生徒のチェックボックスを選ぶ（「全員を選ぶ」もあります）→「チケットを贈る」。生徒のページからも贈れます。",
  "teacherGuide.award.2": "枚数（1〜10枚）とメッセージ（60文字まで、なくてもOK）を決めて「次へ」→「贈る」。",
  "teacherGuide.award.3": "生徒が次にアプリを開くと、メッセージ付きでお知らせが出ます。贈った記録はクラスの「最近のチケット」に残ります。",
  "teacherGuide.ranking.heading": "クラスのランキング",
  "teacherGuide.ranking.p1": "クラスを開いて「ランキング」→「生徒にランキングを表示」のスイッチでオン・オフします。オフでも先生には見えます。",
  "teacherGuide.ranking.p2": "今週（月曜〜日曜）の復習回数で順位をつけます。表示はニックネームだけです。ニックネームがない生徒と、0回の生徒は出ません。",
  "teacherGuide.csv.heading": "CSVで保存",
  "teacherGuide.csv.p1": "「CSVで保存」は3か所にあります。",
  "teacherGuide.csv.overview": "一覧：番号、名前、ニックネーム、最終学習、レビュー数、学習日数、連続、ランク、カード、ガチャ券、要確認",
  "teacherGuide.csv.assignment": "課題のページ：生徒ごとの状態、進み具合（%）、Lv1以上のカード、全カード、マイデッキに追加したか",
  "teacherGuide.csv.awards": "最近のチケット：日時、先生、枚数、人数、生徒、メッセージ",
  "teacherGuide.csv.p2": "ExcelやNumbersで開けます。",
  "teacherGuide.tips.heading": "先生へのヒント",
  "teacherGuide.tips.1": "今の単元の教科書パックを、マイデッキに追加するよう声をかけましょう。課題にすると、だれが追加したか見られます。",
  "teacherGuide.tips.2": "「わかった」「まだ」を正直に押すと復習がうまく働く、と生徒に伝えましょう。ガチャ券は正解の数ではなく、復習した回数でもらえます。",
  "teacherGuide.tips.3": "参加コードは「大きく表示」でプロジェクターに映すと便利です。",
  "teacherGuide.tips.4": "年度が終わったら、クラスをアーカイブしましょう（あとで元に戻せます）。",

  // Times and dates (Japan time): the 次の復習 line and the level ladder
  "time.minutesLater": "{n}分後", // in {n} minutes
  "time.hoursLater": "{n}時間後", // in {n} hours
  "time.monthDay": "{month}月{day}日", // a date like 10月15日; {month} is 1–12
  "time.waitHours": "{n}時間", // how long a level waits: {n} hours
  "time.waitDays": "{n}日", // {n} days
  "time.waitOneWeek": "1週間",
  "time.waitTwoWeeks": "2週間",
  "time.waitMonths": "{n}か月", // {n} months

  // 先生 tab (teacher accounts only): class list
  "teacher.title": "クラス",
  "teacher.createClass": "＋ クラスを作る",
  "teacher.className": "クラス名",
  "teacher.classNamePlaceholder": "例：1年A組",
  "teacher.schoolYear": "年度",
  "teacher.schoolYearValue": "{n}年度", // e.g. 2026年度
  "teacher.create": "作る",
  "teacher.creating": "作成中…",
  "teacher.showArchived": "アーカイブしたクラスを表示",
  "teacher.noClasses": "まだクラスがありません。「＋ クラスを作る」から始めましょう。",
  "teacher.noArchived": "アーカイブしたクラスはありません",
  "teacher.studentCount": "{n}人", // number of students in a class
  "teacher.archivedBadge": "アーカイブ",
  "teacher.backToClasses": "クラス一覧", // back button on a class page

  // 先生 tab: one class
  "teacher.roster": "生徒",
  "teacher.addStudent": "＋ 生徒を追加",
  "teacher.noStudents": "まだ生徒がいません。参加コードを生徒に伝えるか、「＋ 生徒を追加」で追加してください。",
  "teacher.colNumber": "番号",
  "teacher.colName": "名前",
  "teacher.colAccount": "アカウント",
  "teacher.edit": "編集",
  "teacher.editStudent": "{name}さんを編集", // read aloud
  "teacher.save": "保存",
  "teacher.saving": "保存中…",
  "teacher.remove": "外す",
  "teacher.removeConfirm": "{name}さんをこのクラスから外しますか？",
  "teacher.realName": "本名",
  "teacher.studentNumber": "出席番号",
  "teacher.studentNumberHint": "1〜99（なくてもOK）",
  "teacher.joinCode": "参加コード",
  "teacher.joinCodeHelp": "生徒はメニューの「クラスに参加」で、このコードを入力します。",
  "teacher.copy": "コピー",
  "teacher.copied": "コピーしました",
  "teacher.copyFailed": "コピーできませんでした",
  "teacher.showLarge": "大きく表示",
  "teacher.newCode": "新しいコードにする",
  "teacher.newCodeConfirm": "新しいコードにしますか？今のコードは使えなくなります。",
  "teacher.newCodeYes": "新しくする",
  "teacher.joinCodeFor": "{name} の参加コード", // title of the big join-code screen
  "teacher.joinSteps": "メニュー → クラスに参加 → コードを入力", // under the big code
  "teacher.close": "とじる",
  "teacher.teachers": "先生",
  "teacher.you": "（あなた）",
  "teacher.removeTeacher": "{name}を先生から外す",
  "teacher.removeTeacherConfirm": "{name} をこのクラスの担当から外しますか？生徒のデータは消えません。",
  "teacher.leaveClassConfirm": "このクラスの担当から外れますか？外れると、このクラスは見られなくなります。",
  "teacher.leaveClass": "外れる",
  "teacher.sameNumber": "出席番号が同じ生徒がいます",
  "teacher.duplicateNumberTag": "番号重複",
  "teacher.numberTakenConfirm": "出席番号 {n} は すでに {name} さんが使っています。このまま保存しますか？",
  "teacher.saveAnyway": "保存する",
  "teacher.goBack": "戻る",
  "teacher.addTeacher": "＋ 先生を追加",
  "teacher.editClass": "クラス名・年度を変更",
  "teacher.archive": "このクラスをアーカイブ",
  "teacher.archiveConfirm": "アーカイブしますか？生徒はこのクラスに参加できなくなり、クラス一覧から消えます。あとで元に戻せます。",
  "teacher.archiveYes": "アーカイブする",
  "teacher.unarchive": "アーカイブを解除",
  "teacher.archivedNote": "このクラスはアーカイブ中です。生徒は参加できません。",

  // 先生 tab: the search pop-up (add a student / a co-teacher)
  "teacher.searchStudentTitle": "生徒を追加",
  "teacher.searchTeacherTitle": "先生を追加",
  "teacher.searchLabel": "ユーザー名・名前・メールで検索",
  "teacher.searchHint": "2文字以上入力してください",
  "teacher.searching": "検索中…",
  "teacher.noResults": "見つかりませんでした",
  "teacher.resultsLimited": "20件まで表示しています。もっと詳しく入力してください。",
  "teacher.inClass": "追加済み",
  "teacher.teacherBadge": "先生",
  "teacher.choose": "選ぶ",
  "teacher.add": "追加",
  "teacher.adding": "追加中…",
  "teacher.addingStudent": "{name} を追加", // heading of the real name / number form
  "teacher.backToSearch": "検索にもどる",

  // Join a class (students, from the account menu)
  "joinClass.title": "クラスに参加",
  "joinClass.codeLabel": "参加コード（6文字）",
  "joinClass.codeHint": "先生から聞いたコードを入力してください。",
  "joinClass.next": "次へ",
  "joinClass.checking": "確認中…",
  "joinClass.classFound": "クラス：{name}",
  "joinClass.realName": "本名",
  "joinClass.realNamePlaceholder": "例：山田 太郎",
  "joinClass.studentNumber": "出席番号",
  "joinClass.privacyNote": "本名と出席番号は、このクラスの先生だけが見られます。クラスメイトには見えません（ランキングにはニックネームが出ます）。",
  "joinClass.back": "もどる",
  "joinClass.confirm": "「{name}」に参加しますか？",
  "joinClass.confirmName": "名前：{name}",
  "joinClass.confirmNumber": "出席番号：{n}",
  "joinClass.confirmNoNumber": "出席番号：なし",
  "joinClass.join": "参加する",
  "joinClass.joining": "参加中…",
  "joinClass.done": "「{name}」に参加しました！",
  "joinClass.ok": "OK",

  // クラス tab (supabase/polycards-class-tab.sql)
  "joinClass.nicknameStep": "クラスでのニックネームを決めよう",
  "joinClass.confirmNickname": "ニックネーム：{name}",
  "nickname.label": "ニックネーム（12文字まで）",
  "nickname.note": "クラスのランキングで、クラスメイトに表示されます",
  "nickname.placeholder": "例：たろう",
  "nickname.count": "{n}/12", // characters typed, read aloud with the field
  "nickname.sheetTitle": "ニックネームを変更",
  "nickname.save": "保存",
  "nickname.saving": "保存中…",
  "nickname.cancel": "キャンセル",
  "classTab.noClassTitle": "まだクラスに入っていません",
  "classTab.noClassText": "先生から参加コードをもらったら、ここからクラスに参加できます。",
  "classTab.join": "＋ クラスに参加",
  "classTab.pickerLabel": "クラスを選ぶ", // read aloud: the class picker
  "classTab.teachers": "先生：{names}",
  "classTab.teacherSeparator": "、",
  "classTab.nickname": "ニックネーム：{name}",
  "classTab.changeNickname": "変更",
  "classTab.changeNicknameAria": "ニックネームを変更", // read aloud
  "classTab.chooseTitle": "ニックネームを決めよう",
  "classTab.chooseText": "ランキングに出るには、まずこのクラスでのニックネームを決めてください。本名はクラスメイトには見えません。",
  "classTab.chooseSave": "決める",
  "classTab.leaderboardOff": "今はランキングはお休みです",
  "classTab.loadFailed": "クラスを読み込めませんでした",
  "leaderboard.title": "今週のランキング",
  "leaderboard.resets": "月曜日にリセット",
  "leaderboard.rank": "{n}位",
  "leaderboard.reviews": "{n}回",
  "leaderboard.you": "あなた", // small badge on the student's own row
  "leaderboard.myPlace": "あなたは {rank}位（{n}回）",
  "leaderboard.myZero": "今週はまだ0回。1回でもランキングに入れます！",
  "leaderboard.empty": "今週はまだだれも復習していません。最初の1人になろう！",
  "leaderboard.lastWeek": "先週のトップ3",
  "leaderboard.avatarAlt": "ポリアバター",
  "leaderboard.switch": "生徒にランキングを表示", // teacher: the class's switch
  "leaderboard.teacherOff": "ランキングはオフです。生徒には表示されていません。",
  "leaderboard.teacherNote": "今週（月曜〜日曜）の復習回数で順位をつけます。ニックネームがない生徒と0回の生徒は出ません。",
  "classView.leaderboard": "ランキング",
  "teacher.nicknameValue": "ニックネーム：{name}",
  "teacher.noNickname": "ニックネーム未設定",
  "teacher.nicknameLabel": "ニックネーム",
  "teacher.nicknameHint": "空にすると、生徒にもう一度決めてもらいます",
  "errors.nicknameTaken": "そのニックネームはもう使われています。ほかのニックネームにしてください",
  "errors.badNickname": "ニックネームは1〜12文字で入力してください",

  // 先生 tab: one student's page (teacher view)
  "studentPage.open": "{name}さんのページを開く", // read aloud: the name on a roster row
  "studentPage.number": "出席番号 {n}",
  "studentPage.lastStudied": "最後の学習：{when}",
  "studentPage.lastSignIn": "最後のログイン：{when}", // when there is no study yet
  "studentPage.neverActive": "まだ学習していません",
  "studentPage.dateTime": "{date} {time}", // e.g. 10月30日 18:05 (Japan time)
  "studentPage.tickets": "ガチャ券",
  "studentPage.ticketCount": "{n}枚",
  "studentPage.packsTitle": "追加したパック",
  "studentPage.noPacks": "まだパックを追加していません",
  "studentPage.awardsTitle": "もらったチケット",
  "studentPage.noAwards": "まだありません",
  "studentPage.statsTitle": "学習の記録",
  "studentPage.noStudy": "まだ学習の記録がありません",

  // 先生 tab: giving tickets
  "award.give": "チケットを贈る",
  "award.giveCount": "チケットを贈る（{n}人）", // roster button with {n} students selected
  "award.selectAll": "全員を選ぶ",
  "award.clearSelection": "選択を解除",
  "award.select": "{name}さんを選ぶ", // read aloud: a roster checkbox
  "award.to": "贈る相手：{names}",
  "award.nameSeparator": "、", // between two names in award.to
  "award.toMany": "贈る相手：{n}人",
  "award.amount": "枚数",
  "award.less": "1枚へらす", // read aloud: the − button
  "award.more": "1枚ふやす", // read aloud: the ＋ button
  "award.message": "メッセージ（なくてもOK）",
  "award.messagePlaceholder": "例：よくがんばったね！",
  "award.messageCount": "{n}/60",
  "award.next": "次へ",
  "award.confirm": "{students}人 × {amount}枚（合計 {total}枚）を贈りますか？",
  "award.back": "もどる",
  "award.send": "贈る",
  "award.sending": "贈っています…",
  "award.done": "チケットを贈りました！",
  "award.ok": "OK",
  "award.historyTitle": "最近のチケット",
  "award.historyEmpty": "まだチケットを贈っていません",
  "award.amountBadge": "×{n}",
  "award.studentCount": "{n}人",
  "award.andMore": "ほか{n}人",

  // Pop-up for the student when a teacher gave tickets ({name} already includes 先生, e.g. アンドレ先生)
  "awardPopup.label": "先生からのチケット", // read aloud
  "awardPopup.title": "{name}からチケット×{n}！",
  "awardPopup.titleMany": "先生からチケット×{n}！", // tickets from more than one teacher
  "awardPopup.message": "{name}：{text}",
  "awardPopup.toGacha": "ガチャへ",
  "awardPopup.close": "とじる",

  // 先生 tab, Phase 3: class overview (一覧), class trouble words, honesty hint. Teacher-only.
  "classView.label": "表示", // read aloud: the 一覧 / 名簿 switch
  "classView.overview": "一覧",
  "classView.roster": "名簿",
  "overview.title": "学習のようす",
  "overview.periodLabel": "期間", // read aloud: the 7日間 / 30日間 switch
  "overview.period": "{n}日間",
  "overview.col.number": "番号",
  "overview.col.name": "名前",
  "overview.col.lastStudied": "最終学習",
  "overview.col.reviews": "レビュー",
  "overview.col.studyDays": "学習日数",
  "overview.col.streak": "連続",
  "overview.col.rank": "ランク",
  "overview.col.cards": "カード",
  "overview.col.tickets": "ガチャ券",
  "overview.col.flag": "答え方のヒント", // read aloud: the flag column
  "overview.today": "今日",
  "overview.yesterday": "昨日",
  "overview.daysAgo": "{n}日前",
  "overview.never": "—",
  "overview.unstudied": "未学習",
  "overview.flag": "確認したほうがいいかも",
  "overview.note": "レビューと学習日数は{n}日間の数、ほかは今の数です。旗マークは答え方を確認したほうがいいかもしれない生徒です（名前をタップすると詳しく見られます）。",
  "classTrouble.title": "よく間違えた単語（{n}日間）",
  "classTrouble.empty": "この期間によく間違えた単語はありません",
  "classTrouble.note": "初めての答えが「まだ」「わからない」だった単語です。マイデッキにあって、まだマスターしていない単語だけ数えます。",
  "classTrouble.students": "{n}人",
  "classTrouble.misses": "計{n}回",
  "classTrouble.missCount": "×{n}",
  "classTrouble.copy": "コピー",
  "honesty.title": "答え方のようす（{n}日間）",
  "honesty.gapLabel": "タップとスペル（日本語 → English のカード）",
  "honesty.gapLine": "タップでわかった {tap}% ／ スペル正解 {typed}%",
  "honesty.gapPoints": "差 {n}ポイント",
  "honesty.gapCounts": "タップ {tap}回・スペル {typed}回",
  "honesty.gapNotEnough": "データ不足（タップ {tap}回・スペル {typed}回。タップ{minTap}回・スペル{minTyped}回必要です）",
  "honesty.speedLabel": "めくる速さ（日本語 → English のカード）",
  "honesty.speedLine": "めくるまで{sec}秒未満のわかった {n}%",
  "honesty.speedCounts": "{timed}回中{fast}回",
  "honesty.speedNotEnough": "データ不足（時間を記録したタップのわかった {timed}回。{min}回必要です）",
  "honesty.speedSince": "速さは、この機能を入れた日から記録しています。",
  "honesty.flag": "確認したほうがいいかも",
  "honesty.noFlag": "特に気になるところはありません",
  "honesty.note": "これはヒントで、証拠ではありません。スペルは「わかる」より難しいので、少しの差はふつうです。気になるときは本人と話してみてください。",

  // Card reports (ReportFlag.jsx, ReportHost.jsx): the flag on a card and the report pop-up.
  // The reason names are Andre's; the rest is a DRAFT.
  "report.flag": "このカードの問題を報告", // read aloud for the flag button
  "report.title": "問題を報告",
  "report.reasonLabel": "どんな問題？",
  "report.reason.spelling": "スペルがまちがっている",
  "report.reason.meaning": "意味がちがう",
  "report.reason.example": "例文がおかしい",
  "report.reason.accept_answer": "わたしの答えも正しいはず",
  "report.reason.handwriting": "手書きが正しく読まれない",
  "report.reason.audio": "音声がおかしい",
  "report.reason.pos": "品詞がちがう",
  "report.reason.display": "表示がおかしい",
  "report.reason.other": "その他",
  "report.yourAnswer": "あなたの答え", // pre-filled with what was typed or written
  "report.whatAnswer": "どんな答え？", // tap mode: nothing typed, so the student writes it
  "report.noteLabel": "くわしく（書かなくてもOK）",
  "report.count": "{n}/{max}",
  "report.attachShot": "スクリーンショットを付ける",
  "report.shotAlt": "スクリーンショット",
  "report.choosePhoto": "写真をえらぶ",
  "report.photoFailed": "この写真は使えませんでした",
  "report.send": "送る",
  "report.sending": "送信中…",
  "report.sent": "ありがとう！報告しました",
  "report.alreadyReported": "もう報告してあるよ。ありがとう！",

  // Error messages (pop-ups and red text)
  "errors.saveFailed": "保存できませんでした", // a review answer couldn't be saved
  "errors.reportLimit": "今日はもう報告できません。また明日お願いします！", // DRAFT: 20 reports a day
  "errors.reportFailed": "報告を送れませんでした。もう一度ためしてください", // DRAFT
  "errors.reportOpenFailed": "報告の画面を開けませんでした。もう一度ためしてください", // DRAFT: the sheet's code couldn't download
  "errors.cardNotFound": "このカードは見つかりませんでした",
  "errors.notSignedIn": "ログインしてください",
  "errors.noTickets": "ガチャ券がありません",
  "errors.collectionComplete": "全部そろいました！新しいポリアバターをお楽しみに", // the student has every avatar
  "errors.notOwned": "このポリアバターはまだ持っていません",
  "errors.themeLocked": "このテーマはまだ使えません",
  "errors.gachaFailed": "ガチャを読み込めませんでした ({detail})", // {detail} = the technical error, in English
  "errors.notTeacher": "先生のアカウントだけが使えます",
  "errors.notClassTeacher": "このクラスの先生ではありません",
  "errors.badJoinCode": "コードが見つかりません。もう一度確認してください",
  "errors.classArchived": "このクラスにはもう参加できません",
  "errors.alreadyMember": "もうこのクラスに入っています",
  "errors.notMember": "この生徒はクラスにいません",
  "errors.badClassName": "クラス名を入力してください（40文字まで）",
  "errors.badSchoolYear": "年度は4けたの数字で入力してください（例：2026）",
  "errors.badRealName": "名前を入力してください（40文字まで）",
  "errors.badStudentNumber": "出席番号は1〜99の数字で入力してください",
  "errors.queryTooShort": "2文字以上入力してください",
  "errors.userNotFound": "アカウントが見つかりません",
  "errors.targetNotTeacher": "この人は先生のアカウントではありません",
  "errors.lastTeacher": "最後の先生は外せません。先に別の先生を追加してください。",
  "errors.teacherNotInClass": "この先生はもうこのクラスにいません。",
  "errors.alreadyTeacher": "もうこのクラスの先生です",
  "errors.badAmount": "チケットは1〜10枚で選んでください",
  "errors.messageTooLong": "メッセージは60文字までです",
  "errors.noStudents": "生徒を選んでください",
  "errors.classFailed": "うまくいきませんでした ({detail})", // {detail} = the technical error, in English

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

  // Teacher area, Phase 4: assigned packs (課題) and CSV files
  "classView.assignments": "課題",
  "tabs.classDot": "新しい課題があります", // read aloud: the dot on the クラス tab
  "errors.alreadyAssigned": "このパックはもうこのクラスの課題になっています",
  "errors.assignmentNotFound": "この課題は見つかりませんでした（削除されたかもしれません）",
  "errors.deckNotFound": "このパックは見つかりませんでした",
  "errors.noteTooLong": "メモは60文字までです",
  "errors.badDueDate": "期限の日付が正しくありません",
  // Due dates and status (teacher and student)
  "assignment.overdue": "期限すぎ",
  "assignment.dueToday": "今日まで",
  "assignment.dueIn": "あと{n}日",
  "assignment.dueOn": "{date}まで", // {date} = stats.date
  "assignment.noDue": "期限なし",
  "assignment.status.notAdded": "未追加",
  "assignment.status.learning": "学習中",
  "assignment.status.done": "完了",
  "assignment.percent": "{n}%",
  // Teacher: the 課題 view, choosing a pack, one assignment
  "assign.title": "課題",
  "assign.new": "＋ 課題を出す",
  "assign.empty": "課題はまだありません。「＋ 課題を出す」で単語パックを選べます。",
  "assign.archivedNote": "アーカイブしたクラスには課題を出せません。",
  "assign.summary": "完了 {done}／{total}人・追加済み {started}人",
  "assign.open": "「{name}」の進み具合を見る", // read aloud: an assignment row
  "assign.by": "{name}が出題",
  "assign.pickTitle": "課題にするパックを選ぶ",
  "assign.pickNote": "パックをタップすると、期限とメモを決める画面に進みます。あなたのマイデッキには追加されません。",
  "assign.assignedBadge": "出題済み", // pill on a pack this class already has as an assignment
  "assign.backToPick": "パックを選び直す",
  "assign.formTitle": "課題を出す",
  "assign.dueLabel": "期限（なくてもOK）",
  "assign.clearDue": "期限なし",
  "assign.noteLabel": "メモ（なくてもOK）",
  "assign.notePlaceholder": "例：金曜日の小テストに出ます",
  "assign.noteCount": "{n}/60",
  "assign.studentsNote": "クラスの生徒のクラスタブに表示されます。",
  "assign.submit": "課題を出す",
  "assign.delete": "削除",
  "assign.deleteConfirm": "この課題を削除しますか？生徒のマイデッキからは消えません。",
  "assign.tableTitle": "生徒ごとの進み具合",
  "assign.col.number": "番号",
  "assign.col.name": "名前",
  "assign.col.status": "状態",
  "assign.col.cards": "カード", // wide screens: learned / all cards
  "assign.legend": "未追加：マイデッキにまだ追加していない　学習中：追加して復習中　完了：すべてのカードに1回以上正解", // never 学習済み / 覚えた: 完了 only means every card is Lv1+
  "myAssign.guide": "① マイデッキに追加 → ② マイデッキで復習 → ③ 完了！",
  "myAssign.viewWords": "単語を見る",
  "common.backToClass": "クラスにもどる", // back button above a pack's word list opened from the クラス tab
  "assign.progressNote": "進み具合 = Lv1以上になったカード ÷ パックの全カード（英→日と日→英）。ほかのパックで学習した単語も数えます。",
  "assign.statusAria": "{status} {n}%", // read aloud: a progress bar
  // Student: the 課題 section of the クラス tab
  "myAssign.title": "課題",
  "myAssign.note": "「{note}」",
  "myAssign.review": "復習する",
  "myAssign.reviewCount": "復習する（{n}枚）",
  "myAssign.progressAria": "進み具合 {n}%",
  "myAssign.showDone": "完了した課題をすべて表示（{n}）",
  "myAssign.hideDone": "完了した課題をとじる",
  // CSV files (always in Japanese, whatever the language setting)
  "csv.save": "CSVで保存",
  "csv.failed": "CSVを作れませんでした",
  "csv.kind.overview": "一覧",
  "csv.kind.assignment": "課題",
  "csv.kind.awards": "チケット",
  "csv.overview.number": "番号",
  "csv.overview.name": "名前",
  "csv.overview.nickname": "ニックネーム",
  "csv.overview.lastStudied": "最終学習",
  "csv.overview.reviews": "レビュー（{n}日）",
  "csv.overview.studyDays": "学習日数（{n}日）",
  "csv.overview.streak": "連続",
  "csv.overview.rank": "ランク",
  "csv.overview.cards": "カード",
  "csv.overview.tickets": "ガチャ券",
  "csv.overview.flag": "要確認",
  "csv.assignment.number": "番号",
  "csv.assignment.name": "名前",
  "csv.assignment.nickname": "ニックネーム",
  "csv.assignment.status": "状態",
  "csv.assignment.percent": "進み具合（%）",
  "csv.assignment.learned": "Lv1以上のカード",
  "csv.assignment.total": "全カード",
  "csv.assignment.added": "マイデッキ追加",
  "csv.awards.date": "日時",
  "csv.awards.teacher": "先生",
  "csv.awards.amount": "枚数",
  "csv.awards.students": "人数",
  "csv.awards.names": "生徒",
  "csv.awards.message": "メッセージ",
  "csv.yes": "はい",
  "csv.no": "いいえ",
  "csv.nameSeparator": "、",
};
