// All of the app's own text, in English (English mode). Same keys as ja.js.
// Written for junior high school students: short sentences, everyday words, American spelling.
// {name} is a placeholder, filled in by the app. Plural entries are functions: they get the
// placeholders (plus `count`, the plain number, when {n} is a styled element) and return a text
// that still contains {n}, so the app can put the styled number in.
// An empty text ("") means "show nothing here in English mode".

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// one / many: picks the text by the number (count if given, otherwise n).
const plural = (one, many) => ({ count, n } = {}) => (Number(count ?? n) === 1 ? one : many);

export default {
  // Shared: used on several screens
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.mastered": "Mastered",
  "common.backToDashboard": "← Back to My Cards",

  // Header at the top of every screen: logo button and gacha button (read aloud only)
  "header.home": "My Cards",
  "header.gacha": "Gacha",
  "header.gachaTickets": plural("Gacha ({n} ticket)", "Gacha ({n} tickets)"),

  // Account menu (the round button with the student's initial)
  "menu.account": "Account",
  "menu.accountNewTheme": "Account: new theme unlocked",
  "menu.rank": "Rank {n}",
  "menu.settings": "Settings",
  "menu.help": "Help",
  "menu.signOut": "Log out",
  "menu.signOutConfirm": "Log out?",

  // Bottom tab bar
  "tabs.myCards": "My Cards",
  "tabs.cardSets": "Card Sets",

  // My Cards dashboard: review button and My Decks list
  "myCards.startReview": "Start review",
  "myCards.dueTotal": "{n} cards to review in total",
  "myCards.sessionCount": plural("{n} card", "{n} cards"),
  "myCards.nothingDue": "No cards to review",
  "myCards.nextReview": plural("Next review: {n} card {when}", "Next review: {n} cards {when}"), // {when} = "in 2 hours" / "on Oct 24"
  "myCards.nothingDueAlert": "Nothing is due right now.",
  "myCards.mastered": "Mastered {n}",
  "myCards.myDecks": "My Decks",
  "myCards.deckDue": "{n} to review",
  "myCards.deckNothingDue": "Nothing due",
  "myCards.remove": "Remove",
  "myCards.removing": "Removing…",
  "myCards.removeConfirm": "Remove \"{name}\" from My Cards? Your review progress for this deck will be lost.",
  "myCards.empty.heading": "No decks yet",
  "myCards.empty.body": "Go to the Card Sets tab, choose a unit from your textbook, and tap \"+ Add to My Cards.\" Then you can review the cards here.",
  "myCards.empty.button": "Go to Card Sets",

  // Player card and level chart on My Cards
  "stats.rankLabel": "Your rank",
  "stats.rank": "Rank {n}",
  "stats.points": "{n} pt",
  "stats.best": "Best {n} pt",
  "stats.spellingBonus": "Spelling bonus {n} pt",
  "stats.openCollection": "Open avatar collection",
  "stats.toNextRank": "Next rank",
  "stats.toNextRankLeft": "{value}",
  "stats.toNextRankValue": "{n} pt more → Rank {rank}",
  "stats.chartTitle": "Cards by level",
  "stats.chartTotal": plural("{n} card in total", "{n} cards in total"),
  "stats.chartLevel": "Lv{n}",
  "stats.chartNote": "Lv7 cards come back in about 4 months. Get them right to master them!",

  // How-to-answer switch (My Cards and settings)
  "answerMode.title": "How to answer (Japanese → English)",
  "answerMode.label": "How to answer",
  "answerMode.off": "Buttons",
  "answerMode.off.note": "Look at the answer, then tap I knew it or Still learning.",
  "answerMode.typing": "Typing",
  "answerMode.typing.note": "Type the English word. Correct spelling = +1 pt.",
  "answerMode.handwriting": "Handwriting",
  "answerMode.handwriting.note": "Write the English word with an Apple Pencil. Write it correctly for +1 pt.",

  // Review and Card Sets drill: the study card and the answer area
  "review.questionEn2jp": "What is this word in Japanese?",
  "review.questionJp2en": "What is this word in English?",
  "review.progress": "Learned: {cleared} · Left: {left}",
  "review.defaultName": "Review",
  "review.tapToFlip": "Tap to flip",
  "review.answerPill": "Answer",
  "review.levelChip": "Lv {n}",
  "review.levelUp": "Lv {n}!",
  "review.levelUpMastered": "Mastered!",
  "review.showAnswer": "Show answer",
  "review.notYet.en": "Still learning",
  "review.notYet.ja": "", // English mode: English only
  "review.gotIt.en": "I knew it",
  "review.gotIt.ja": "", // English mode: English only
  "review.notYetNote": "Still learning is OK! You'll see this card again soon.",
  "review.typingLabel": "Type the answer in English",
  "review.typingPlaceholder": "English",
  "review.otherMeaning": "That word has the same meaning, but it's not this card's word. Try again!",
  "review.dontKnow": "I don't know",
  "review.checking": "Checking…",
  "review.submit": "Answer",
  "review.correct": "✓ Correct!",
  "review.close": "So close!",
  "review.yourAnswer": "Your answer: {answer}",
  "review.rightAnswer": "Correct answer: {answer}",
  "review.textbookAnswer": "Textbook answer: {answer}",
  "review.spellBonus": "+1 spelling",
  "review.next": "Next",
  "review.allCleared": "All done!",
  "review.backToDashboard": "Back to My Cards",

  // Handwriting answer mode (Apple Pencil) in reviews
  "handwriting.hint": "Use your Apple Pencil. Write one letter in each box.",
  "handwriting.boxLabel": "Letter {n}",
  "handwriting.clear": "Erase",
  "handwriting.undo": "Undo",
  "handwriting.submit": "Answer",
  "handwriting.reading": "Reading…",
  "handwriting.read": "I read: {answer}",
  "handwriting.lenient": "Your \"{target}\" looks like \"{read}\". Write carefully!",
  "handwriting.unavailable": "Handwriting isn't ready. Please type your answer this time.",

  // Back of the card: example sentence and dictionary link
  "wordInfo.example": "Example",
  "wordInfo.dictionary": "Look it up",

  // Mastered list
  "mastered.restore": "Review again",
  "mastered.restoreConfirm": "Put this card back into your reviews?",
  "mastered.restoreYes": "Yes",
  "mastered.empty": "No mastered cards yet",

  // Review plan pop-up
  "reviewPlan.title": "Review schedule",
  "reviewPlan.today": "Today",
  "reviewPlan.tomorrow": "Tomorrow",
  "reviewPlan.todayEmpty": "No more reviews today",
  "reviewPlan.tomorrowEmpty": "No reviews tomorrow",
  "reviewPlan.total": plural("{n} card", "{n} cards"),
  "reviewPlan.hourCount": "+{n}",
  "reviewPlan.runningTotal": "{n} total",

  // Card Sets tab
  "cardSets.title": "Card Sets",
  "cardSets.titleJa": "", // the small Japanese line next to the title: hidden in English mode
  "cardSets.hubIntro": "Choose a set you want to learn, and add it to My Cards.",
  "cardSets.textbooks": "Textbooks",
  "cardSets.textbooksLabel": "Find by textbook",
  "cardSets.textbooksNote": "Sets for each unit and part of New Horizon and Power On",
  "cardSets.tests": "Tests & Themes",
  "cardSets.testsLabel": "Find by test or theme",
  "cardSets.testsNote": "Sets for tests like Eiken, and word sets by theme",
  "cardSets.comingSoon": "Coming soon",
  "cardSets.comingSoonNote": "Sets for Eiken and more are coming soon.",
  "cardSets.back": "← {label}",
  "cardSets.loading": "Loading the library…",
  "cardSets.levelSwitchLabel": "School level",
  "cardSets.levelJHS": "Junior High",
  "cardSets.levelHS": "High School",
  "cardSets.levelOther": "Other",
  "cardSets.noTextbooks": "No textbooks yet.",
  "cardSets.noUnits": "No units yet.",
  "cardSets.noDecks": "No decks yet.",
  "cardSets.unitCount": plural("{n} unit", "{n} units"),
  "cardSets.deckCount": plural("{n} deck", "{n} decks"),
  "cardSets.wordCount": plural("{n} word", "{n} words"),
  "cardSets.addedBadge": "Added",
  "cardSets.add": "+ Add to My Cards",
  "cardSets.adding": "Adding…",
  "cardSets.added": "✓ Added to My Cards",
  "cardSets.deckEmpty": "This deck has no cards yet.",
  "cardSets.signInToAdd": "Please log in to add decks to My Cards.",

  // Word list of a Card Sets deck
  "wordList.wordCount": plural("{n} word", "{n} words"),
  "wordList.hideSwitch": "Hide Japanese",
  "wordList.tapToShow": "Tap to show",
  "wordList.showWord": "Show Japanese: {word}",
  "wordList.hideWord": "Hide Japanese: {word}",
  "wordList.startDrill": "Start drill",

  // Gacha screen and the pull result
  "gacha.title": "Gacha",
  "gacha.collectionLink": "Avatar Collection {owned} / {total} →",
  "gacha.tickets": "Gacha tickets",
  "gacha.ticketCount": "× {n}",
  "gacha.pull": "Spin the gacha",
  "gacha.pulling": "Spinning…",
  "gacha.noTicketsNote": "No tickets. Do your reviews to get gacha tickets!",
  "gacha.ticketTomorrow": "You got today's ticket! Your next ticket comes tomorrow.",
  "gacha.toNextTicket": "Reviews to the next ticket: {n}",
  "gacha.perTicket": "1 ticket every {n} reviews (1 a day max)",
  "gacha.odds": "Chances",
  "gacha.percent": "{n}%",
  "gacha.noRepeats": "You never get the same avatar twice. It's always a new one!",
  "gacha.result": "Gacha result",
  "gacha.tapToSkip": "Tap to skip",
  "gacha.new": "NEW!",
  "gacha.avatar": "Avatar",
  "gacha.avatarFallback": "Avatar",
  "gacha.starterAvatarLabel": "Avatar",
  "gacha.equip": "Wear",
  "gacha.equipping": "Putting it on…",
  "gacha.wearing": "Wearing",
  "gacha.again": "Spin again {left}",
  "gacha.ticketsLeft": plural("({n} ticket left)", "({n} tickets left)"),
  "gacha.close": "Close",

  // Avatar collection
  "collection.back": "← Gacha",
  "collection.backToDashboard": "← Back",
  "collection.title": "Avatar Collection",
  "collection.wornAvatar": "Your avatar",
  "collection.notOwned": "An avatar you don't have yet",
  "collection.silhouetteLabel": "?",
  "collection.wornLabel": "{nameEn}, wearing now",
  "collection.equipLabel": "Wear {nameEn}",

  // Rarity names
  "rarity.normal": "Normal",
  "rarity.rare": "Rare",
  "rarity.superRare": "Super Rare",
  "rarity.secret": "Secret",

  // Settings screen
  "settings.back": "← Back",
  "settings.title": "Settings",
  "settings.themes": "Themes",
  "settings.themesFailed": "Couldn't load the themes",
  "settings.themeLocked": "Unlocks at Rank {n}",
  "settings.study": "Study",
  "settings.sessionSize": "Cards per review",
  "settings.sessionSizeOption": "{n} cards", // always 10, 20 or 30
  "settings.sessionSizeNote": "How many cards come up in one review",
  "settings.display": "Display",
  "settings.reduceMotion": "Less motion",
  "settings.reduceMotionNote": "Stops the card flip and the sparkles",
  "settings.language": "言語 / Language", // same text in every language, so a student can always find the way back
  "settings.languageJa": "日本語",
  "settings.languageEn": "English",

  // Themes: tile status lines, the small preview, and the unlock pop-up
  "themes.fromStart": "From the start",
  "themes.unlockedAt": "Unlocked at Rank {n}",
  "themes.unlocksAt": "Unlocks at Rank {n}",
  "themes.tileLabel": "{name} ({status})",
  "themes.previewLabel": "{name} preview",
  "themes.previewRank": "Rank",
  "themes.previewNotYet": "Still learning",
  "themes.previewGotIt": "I knew it",
  "themes.rankReached": "Rank {n} reached!",
  "themes.newTheme": "New theme unlocked: {name}",
  "themes.others": plural("You also unlocked {n} more theme.", "You also unlocked {n} more themes."),
  "themes.useNow": "Use it now",
  "themes.saving": "Saving…",
  "themes.later": "Later",

  // "What is Polycards?" pop-up
  "about.button": "What is Polycards?",
  "about.buttonLabel": "What is Polycards?",
  "about.title": "What is Polycards?",
  "about.subtitle": "How Polycards works",
  "about.forgetting.heading": "Forgetting is normal",
  "about.forgetting.p1": "If you do nothing, you forget most new words in a few days. This is called the \"forgetting curve,\" and it happens to everyone. But if you remember a word again when you are about to forget it, the memory stays much longer.",
  "about.ladder.heading": "The level ladder",
  "about.ladder.before": "When you tap \"I knew it,\" the card goes up one level, and you wait longer before you see it again.",
  "about.ladder.after": "When you tap \"Still learning,\" the card goes down a little and comes back sooner. Mistakes are OK. Trying to remember is studying!",
  "about.ladderLabel": "Levels and the time until the next review",
  "about.ladderLevel": "Lv{n}",
  "about.ladderMastered": "Mastered!",
  "about.science.heading": "The science",
  "about.science.p1": "Polycards uses two ways of studying that research shows really work.",
  "about.science.spaced": "Spaced repetition: Review a few times, with breaks in between. You remember better than when you study a lot at once.",
  "about.science.retrieval": "Retrieval practice: Try to remember the answer before you look. You remember more than when you only read.",
  "about.why.heading": "Why it helps you",
  "about.why.1": "You don't spend time on words you already know. You only review words you are about to forget.",
  "about.why.2": "Up to {sessionSize} cards at a time. A little every day is OK.",
  "about.why.3": "You keep remembering the words, even after the test.",
  "about.tips.heading": "Tips",
  "about.tips.1": "Study a little every day. It works better than a lot at once.",
  "about.tips.2": "Really try to remember before you look at the answer.",
  "about.tips.3": "Be honest when you tap \"I knew it\" or \"Still learning.\" If you aren't, you only make it harder for yourself to learn.",
  "about.tips.4": "English → Japanese and Japanese → English are different cards.",

  // Times and dates (Japan time)
  "time.minutesLater": plural("in {n} minute", "in {n} minutes"),
  "time.hoursLater": plural("in {n} hour", "in {n} hours"),
  "time.monthDay": ({ month, day } = {}) => `on ${MONTHS[Number(month) - 1] ?? month} ${day}`, // only used in the "Next review" line
  "time.waitHours": plural("{n} hour", "{n} hours"),
  "time.waitDays": plural("{n} day", "{n} days"),
  "time.waitOneWeek": "1 week",
  "time.waitTwoWeeks": "2 weeks",
  "time.waitMonths": plural("{n} month", "{n} months"),

  // Error messages
  "errors.saveFailed": "Couldn't save",
  "errors.cardNotFound": "Couldn't find this card",
  "errors.notSignedIn": "Please log in",
  "errors.noTickets": "You have no gacha tickets",
  "errors.collectionComplete": "You have them all! Watch for new avatars.",
  "errors.notOwned": "You don't have this avatar yet",
  "errors.themeLocked": "You can't use this theme yet",
  "errors.gachaFailed": "Couldn't load the gacha ({detail})",
};
