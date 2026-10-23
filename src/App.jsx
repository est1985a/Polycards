import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import * as api from './lib/api';
import { buildCards, buildReviewCards } from './lib/drill';
import { loadSchoolLevel, saveSchoolLevel } from './lib/library';
import { totalPoints, levelCounts, playerRank, newPeak } from './lib/points';
import { loadAnswerMode, saveAnswerMode } from './lib/spelling';
import { HANDWRITING_ENABLED } from './handwriting/config';
import { nextReviewSummary } from './lib/schedule';
import { singleFlight } from './lib/gacha';
import { testLoginEmail, LOGIN_FAILED_MESSAGE } from './lib/login';
import {
  loadSessionSize, saveSessionSize, loadReduceMotion, saveReduceMotion, applyReduceMotion, saveLang, applyLang,
  loadThemeCache, saveThemeCache, clearThemeCache, loadSeenThemes, saveSeenThemes, devThemeOverride,
} from './lib/settings';
import { themeList, newThemes, featuredUnlock, markSeen } from './lib/themeUnlocks';
import { themes, applyTheme, getTheme, DEFAULT_THEME } from './themes';
import { wrap, gutter, headerBand, tabBarHeight, btnLink, wideLayout } from './styles/theme';
import { useWide } from './lib/useWide';
import { t, getLang } from './i18n';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import Tabs from './components/Tabs';
import MyCardsTab from './components/MyCardsTab';
import CardSetsTab from './components/CardSetsTab';
import StudySession from './components/StudySession';
import WordList from './components/WordList';
import MasteredList from './components/MasteredList';
import ReviewPlanSheet from './components/ReviewPlanSheet';
import AboutSheet from './components/AboutSheet';
import GachaScreen from './components/GachaScreen';
import GachaReveal from './components/GachaReveal';
import GachaCollection from './components/GachaCollection';
import SettingsScreen from './components/SettingsScreen';
import ThemeUnlockSheet from './components/ThemeUnlockSheet';

// A theme key from the account or the device; unknown keys become the default theme.
const knownTheme = (key) => (themes[key] ? key : DEFAULT_THEME);

const TABS = [
  { id: 'myCards', label: 'tabs.myCards' },
  { id: 'cardSets', label: 'tabs.cardSets' },
];

function App() {
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Screens: 'dashboard', 'wordList' (Card Sets deck, before the drill), 'study', 'mastered',
  // 'gacha', 'collection' (アバター図鑑) or 'settings' (設定)
  const [view, setView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("myCards"); // always open on My Cards

  // Card Sets (global library)
  const [libraryData, setLibraryData] = useState([]); // textbooks, from shapeLibrary
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [collectionsData, setCollectionsData] = useState(null); // Tests & Themes tree (shapeCollections), null until loaded
  // Which Card Sets screen is open, plus the chosen school level (see src/lib/library.js).
  // Kept here so that coming back from a deck's word list or drill returns to the same deck list.
  // The level starts from the one saved on the last visit.
  const [cardSetsPath, setCardSetsPath] = useState(() => ({ screen: "hub", level: loadSchoolLevel(window.localStorage) }));
  const [answerMode, setAnswerMode] = useState(() => loadAnswerMode(window.localStorage, HANDWRITING_ENABLED)); // 答え方: off / typing / handwriting
  // Settings saved on this device (src/lib/settings.js)
  const [sessionSize, setSessionSize] = useState(() => loadSessionSize(window.localStorage)); // 1回の枚数
  const [reduceMotion, setReduceMotion] = useState(() => loadReduceMotion(window.localStorage)); // カードの動きを減らす
  const [lang, setLangState] = useState(getLang); // 言語 / Language, applied in main.jsx before the first render

  // Theme: saved on the account (gacha_set_theme), cached on the device. main.jsx already applied the cache.
  const [themeKey, setThemeKey] = useState(() => knownTheme(loadThemeCache(window.localStorage)));
  const [themeRows, setThemeRows] = useState(null); // theme_unlocks rows, read once after sign-in (null while loading)
  const [themesFailed, setThemesFailed] = useState(false);
  const [themeError, setThemeError] = useState(null); // save error shown in settings
  // Seen themes marked in this visit, also kept in memory so the pop-up closes even when the device
  // blocks storage: { userId, keys }.
  const [seenNow, setSeenNow] = useState({ userId: null, keys: [] });
  const themeSaving = useRef(false); // while a choice is being saved, an older gacha_status must not undo it

  // Study session
  const [activeSet, setActiveSet] = useState(null);
  const [sessionKey, setSessionKey] = useState(0); // bumps to start a fresh StudySession
  const [loadingDeck, setLoadingDeck] = useState(false);

  // My Cards
  const [myDeckIds, setMyDeckIds] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [dueRows, setDueRows] = useState([]);
  const [nextReview, setNextReview] = useState(null); // { at, count } of the next review, from fetchNextReview
  const [now, setNow] = useState(() => Date.now()); // for the "2時間後" wording; updated every minute
  const [planRows, setPlanRows] = useState(null); // review plan pop-up rows (null while loading)
  const [planOpen, setPlanOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false); // "What is Polycards?" pop-up
  const [savingDeck, setSavingDeck] = useState(false);
  const [removingDeckId, setRemovingDeckId] = useState(null);
  const [stats, setStats] = useState(null); // points and rank
  const [masteredCards, setMasteredCards] = useState([]);
  const [restoringCardId, setRestoringCardId] = useState(null);

  // Gacha (tickets and avatars come only from the database functions, see api.js)
  const [gacha, setGacha] = useState(null); // gacha_status, null while loading
  const [gachaPulse, setGachaPulse] = useState(false); // one pulse of the header button
  const pulseChecked = useRef(false); // the pulse is only for the first status after sign-in
  const [pulling, setPulling] = useState(false);
  const [gachaError, setGachaError] = useState(null);
  const [reveal, setReveal] = useState(null); // gacha_pull result being shown
  const [revealKey, setRevealKey] = useState(0); // new reveal animation for each pull
  const [collection, setCollection] = useState(null); // gacha_collection rows
  const [equippingId, setEquippingId] = useState(null);

  // The pull is wrapped once (kept across re-renders), so a double tap only pulls once.
  // It only uses state setters, which never change, so the first copy stays correct.
  const [pullOnce] = useState(() => singleFlight(async () => {
    setPulling(true);
    setGachaError(null);
    try {
      setReveal(await api.pullGacha());
      setRevealKey((k) => k + 1);
    } catch (e) {
      setReveal(null);
      setGachaError(e.message);
    }
    setPulling(false);
    try {
      setGacha(await api.fetchGachaStatus()); // fewer tickets, new odds
    } catch (e) {
      console.error(e);
    }
  }));

  const wide = useWide(); // landscape iPad or bigger: wider layout

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        setMyDeckIds([]); setMyDecks([]); setStats(null);
        setGacha(null); setReveal(null); setCollection(null); pulseChecked.current = false;
        setThemeRows(null); setThemesFailed(false);
      }
      // Log-out: forget this account's theme on the device and go back to Midnight.
      if (event === "SIGNED_OUT") {
        clearThemeCache(window.localStorage);
        setThemeKey(DEFAULT_THEME);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // The rank each theme needs, read once after sign-in. If it can't be read, only Midnight is offered.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    api.fetchThemeUnlocks()
      .then((rows) => { setThemeRows(rows); setThemesFailed(false); })
      .catch((e) => {
        console.error(e);
        setThemeRows([{ theme_key: DEFAULT_THEME, unlock_level: 1 }]);
        setThemesFailed(true);
      });
  }, [userId]);

  // Show the chosen theme (not while trying one with ?theme= in development).
  useEffect(() => {
    if (!devThemeOverride()) applyTheme(getTheme(themeKey));
  }, [themeKey]);

  // The account's theme from gacha_status wins over the device's copy.
  const accountTheme = gacha?.theme ?? null;
  useEffect(() => {
    if (!accountTheme || themeSaving.current) return;
    const key = knownTheme(accountTheme);
    setThemeKey(key);
    saveThemeCache(window.localStorage, key);
  }, [accountTheme]);

  useEffect(() => {
    applyReduceMotion(reduceMotion);
  }, [reduceMotion]);

  // <html lang>: the login screen is always Japanese; signed in, the chosen language.
  useEffect(() => {
    document.documentElement.lang = session ? lang : "ja";
  }, [session, lang]);

  // Fetch the Global Library when the dashboard loads
  useEffect(() => {
    if (session && view === "dashboard") loadLibrary();
  }, [session, view]);

  // Load the decks this student has added to My Cards
  useEffect(() => {
    if (session) loadMyDecks();
  }, [session]);

  // Refresh the "due now" counts whenever the dashboard is shown
  useEffect(() => {
    if (session && view === "dashboard") loadDueRows();
  }, [session, view]);

  // Recount points whenever the dashboard is shown (so right after every review)
  useEffect(() => {
    if (session && view === "dashboard") loadStats(session.user.id);
  }, [session, view]);

  // Gacha status: when the app opens, after every review (the dashboard is shown again),
  // when the gacha screen opens, and whenever the app comes back into view.
  useEffect(() => {
    if (session && (view === "dashboard" || view === "gacha")) loadGacha();
  }, [session, view]);

  useEffect(() => {
    if (!session) return;
    const onVisible = () => { if (document.visibilityState === "visible") loadGacha(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session]);

  // The header pulse plays once; switch it off so it doesn't replay when the header changes.
  useEffect(() => {
    if (!gachaPulse) return;
    const timer = setTimeout(() => setGachaPulse(false), 1500);
    return () => clearTimeout(timer);
  }, [gachaPulse]);

  // Notice when the next review time arrives. A one-minute timer keeps "2時間後" up to date and
  // reloads the due cards once the time has passed. Phones pause timers while the screen is off,
  // so the due cards are also reloaded whenever the app comes back into view.
  const waitingForNext = !!session && view === "dashboard" && dueRows.length === 0 && !!nextReview;
  useEffect(() => {
    if (!waitingForNext) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= nextReview.at) loadDueRows();
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [waitingForNext, nextReview]);

  useEffect(() => {
    if (!session || view !== "dashboard") return;
    const onVisible = () => { if (document.visibilityState === "visible") loadDueRows(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session, view]);

  async function loadLibrary() {
    setLoadingLibrary(true);
    // Tests & Themes loads on its own, so a problem there never hides the textbooks (and the
    // other way round). If it fails, the list shows Coming soon.
    api.fetchCollections()
      .then(setCollectionsData)
      .catch((e) => {
        console.error(e);
        setCollectionsData((prev) => prev ?? []);
      });
    try {
      setLibraryData(await api.fetchLibrary());
    } catch (e) {
      alert(e.message);
    }
    setLoadingLibrary(false);
  }

  async function loadMyDecks() {
    try {
      const rows = await api.fetchMyDecks();
      setMyDeckIds(rows.map((r) => r.deck_id));
      setMyDecks(rows.filter((r) => r.decks).map((r) => r.decks));
    } catch (e) {
      console.error(e);
    }
  }

  // Due cards, plus the next review after now (for the 次の復習 line when nothing is due).
  async function loadDueRows() {
    const [due, next] = await Promise.allSettled([api.fetchDueRows(), api.fetchNextReview()]);
    setNow(Date.now());
    if (due.status === "fulfilled") setDueRows(due.value); else console.error(due.reason);
    if (next.status === "fulfilled") setNextReview(next.value); else console.error(next.reason);
  }

  // Review plan pop-up: open it right away (showing 読み込み中…), then load the plan.
  async function openPlan() {
    setPlanRows(null);
    setNow(Date.now());
    setPlanOpen(true);
    try {
      setPlanRows(await api.fetchReviewPlanRows());
    } catch (e) {
      setPlanOpen(false);
      alert(e.message);
    }
  }

  const closePlan = useCallback(() => setPlanOpen(false), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  function changeAnswerMode(mode) {
    setAnswerMode(mode);
    saveAnswerMode(window.localStorage, mode);
  }

  function changeSessionSize(size) {
    setSessionSize(size);
    saveSessionSize(window.localStorage, size);
  }

  function changeReduceMotion(on) {
    setReduceMotion(on);
    saveReduceMotion(window.localStorage, on);
  }

  // 言語 / Language: switches every text at once (the state change re-renders the whole app).
  function changeLang(next) {
    const used = applyLang(next);
    saveLang(window.localStorage, used);
    setLangState(used);
  }

  // Themes: unlocked by rank (the one the player card shows); "new" = unlocked but not yet shown.
  const rank = stats?.playerRank ?? null;
  const themeItems = useMemo(() => (themeRows ? themeList(themeRows, themes) : null), [themeRows]);
  // Unlocked themes already shown to this student: saved on the device per user (a short list,
  // read on each render), plus the ones marked in this visit.
  const seenThemes = [
    ...loadSeenThemes(window.localStorage, userId),
    ...(seenNow.userId === userId ? seenNow.keys : []),
  ];
  const hasNewTheme = !!themeItems && rank != null && newThemes(themeItems, rank, seenThemes).length > 0;
  const unlock = themeItems && rank != null ? featuredUnlock(themeItems, rank, seenThemes) : null;

  // Every theme unlocked now counts as seen (the dot and the pop-up go away).
  function markThemesSeen() {
    if (!themeItems || rank == null || !userId) return;
    const keys = markSeen(themeItems, rank, seenThemes);
    saveSeenThemes(window.localStorage, userId, keys);
    setSeenNow({ userId, keys });
  }

  // Applies a theme at once, then saves it on the account. If saving fails, the previous theme
  // comes back and the error is shown (and thrown, for the unlock pop-up).
  async function chooseTheme(key) {
    const previous = themeKey;
    setThemeError(null);
    if (key === previous) return;
    setThemeKey(key);
    themeSaving.current = true;
    try {
      await api.setGachaTheme(key);
      saveThemeCache(window.localStorage, key);
      setGacha((g) => g && { ...g, theme: key });
    } catch (e) {
      setThemeKey(previous);
      setThemeError(e.message);
      throw e;
    } finally {
      themeSaving.current = false;
    }
  }

  function openSettings() {
    setPlanOpen(false);
    setAboutOpen(false);
    setReveal(null);
    setThemeError(null);
    markThemesSeen();
    setView("settings");
    window.scrollTo(0, 0);
  }

  // Unlock pop-up: 今すぐ使う saves the theme first (the pop-up stays open if that fails).
  async function applyUnlockedTheme() {
    await chooseTheme(unlock.theme.key);
    markThemesSeen();
  }

  async function loadStats(userId) {
    try {
      await api.waitForPendingSaves(); // include the last answers of a review that just ended
      const [levels, savedPeak, bonusPoints] = await Promise.all([
        api.fetchAllCardLevels(),
        api.fetchPeakPoints(),
        // The spelling bonus only adds to rank; if it can't be read, show the rest anyway.
        api.fetchBonusPoints().catch((e) => { console.error(e); return 0; }),
      ]);
      const currentPoints = totalPoints(levels);
      const peakPoints = newPeak(currentPoints, savedPeak);
      if (peakPoints > savedPeak) await api.savePeakPoints(userId, peakPoints);
      setStats({
        currentPoints, peakPoints, bonusPoints,
        playerRank: playerRank(peakPoints + bonusPoints), // same as gacha_player_level() in the database
        levelCounts: levelCounts(levels),
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadGacha() {
    try {
      await api.waitForPendingSaves(); // answers just given may earn a ticket
      const status = await api.fetchGachaStatus();
      setGacha(status);
      if (!pulseChecked.current) {
        pulseChecked.current = true;
        if (status.tickets > 0) setGachaPulse(true);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function openGacha() {
    setPlanOpen(false);
    setAboutOpen(false);
    setGachaError(null);
    setView("gacha");
    window.scrollTo(0, 0);
  }

  async function openCollection() {
    setCollection(null);
    setView("collection");
    window.scrollTo(0, 0);
    try {
      setCollection(await api.fetchGachaCollection());
    } catch (e) {
      alert(e.message);
      setView("gacha");
    }
  }

  // Wear an owned avatar (from the reveal or the collection).
  async function equip(avatarId) {
    setEquippingId(avatarId);
    try {
      await api.equipAvatar(avatarId);
      setCollection((rows) => rows && rows.map((r) => ({ ...r, equipped: r.id === avatarId })));
      setGacha(await api.fetchGachaStatus());
    } catch (e) {
      alert(e.message);
    }
    setEquippingId(null);
  }

  // A tab tapped on the gacha screens goes back to the dashboard on that tab.
  function leaveGachaTo(id) {
    setView("dashboard");
    setActiveTab(id);
    window.scrollTo(0, 0);
  }

  const handleGoogleLogin = async () => {
    setAuthError(null);
    // Come back to the site we started from (localhost in development, the live site in production).
    // Supabase only allows addresses listed under Authentication → URL Configuration → Redirect URLs.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
  };

  // Test accounts: a username like "aiden" signs in as aiden@polycards.test.
  const handlePasswordLogin = async (username, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: testLoginEmail(username), password });
    if (error) setAuthError(LOGIN_FAILED_MESSAGE);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearThemeCache(window.localStorage); // also done on SIGNED_OUT; here too in case that event is missed
    setThemeKey(DEFAULT_THEME);
    goHome(); // the next sign-in starts on My Cards too
  };

  // Logo: back to the My Cards dashboard, with Card Sets reset to its hub (the school level is kept).
  // Leaving a review loses nothing: each answer is saved as soon as it is given.
  function goHome() {
    setPlanOpen(false);
    setAboutOpen(false);
    setReveal(null);
    setView("dashboard");
    setActiveTab("myCards");
    setCardSetsPath((p) => ({ screen: "hub", level: p.level }));
    window.scrollTo(0, 0);
  }

  function beginSession(set) {
    setActiveSet(set);
    setSessionKey((k) => k + 1);
    setView("study");
  }

  // Card Sets: open a deck's word list; the "try it" drill starts from there
  async function startDeck(deck) {
    setLoadingDeck(true);
    try {
      const words = await api.fetchDeckWords(deck.id);
      if (words.length === 0) throw new Error();
      setActiveSet({ id: deck.id, name: deck.name, cards: buildCards(words) });
      setView("wordList");
    } catch {
      alert(t("cardSets.deckEmpty"));
    }
    setLoadingDeck(false);
  }

  // My Cards: SRS review of due cards (all decks, or one deck)
  async function startReview(deck = null) {
    if (!session) return;
    setLoadingDeck(true);
    try {
      const rows = await api.fetchReviewRows(deck?.id, sessionSize);
      if (rows.length === 0) {
        alert(t("myCards.nothingDueAlert"));
      } else {
        beginSession({ id: deck?.id || 'review', name: deck?.name || t("review.defaultName"), cards: buildReviewCards(rows), mode: 'srs' });
      }
    } catch (e) {
      alert(e.message);
    }
    setLoadingDeck(false);
  }

  // My Cards: list of Mastered cards
  async function openMastered() {
    setLoadingDeck(true);
    try {
      await api.waitForPendingSaves(); // include a card mastered in the review that just ended
      setMasteredCards(await api.fetchMasteredCards());
      setView("mastered");
      window.scrollTo(0, 0);
    } catch (e) {
      alert(e.message);
    }
    setLoadingDeck(false);
  }

  // Puts a Mastered card back into reviews (level 1, due now). MasteredList asks first.
  // Due counts and points are reloaded when the dashboard is shown again.
  async function restoreCard(card) {
    if (!session) return;
    setRestoringCardId(card.id);
    try {
      await api.restoreMasteredCard(session.user.id, card);
      setMasteredCards((cards) => cards.filter((c) => c.id !== card.id));
    } catch (e) {
      alert(e.message);
    }
    setRestoringCardId(null);
  }

  async function addDeck() {
    if (!session) {
      alert(t("cardSets.signInToAdd"));
      return;
    }
    if (!activeSet) return;
    setSavingDeck(true);
    try {
      await api.addDeckToMyCards(session.user.id, activeSet.id);
      await loadMyDecks();
    } catch (e) {
      alert(e.message);
    }
    setSavingDeck(false);
  }

  async function removeDeck(deck) {
    if (!session) return;
    if (!window.confirm(t("myCards.removeConfirm", { name: deck.name }))) return;
    setRemovingDeckId(deck.id);
    try {
      await api.removeDeckFromMyCards(session.user.id, deck.id);
    } catch (e) {
      alert(e.message);
    }
    await Promise.all([loadMyDecks(), loadDueRows(), loadStats(session.user.id)]);
    setRemovingDeckId(null);
  }

  // Each Card Sets screen starts at the top of the page. The school level is saved for next visit.
  function navigateCardSets(path) {
    if (path.level !== cardSetsPath.level) saveSchoolLevel(window.localStorage, path.level);
    setCardSetsPath(path);
    window.scrollTo(0, 0);
  }

  // Tapping Card Sets while already on it goes back to the hub.
  function changeTab(id) {
    if (id === "cardSets" && activeTab === "cardSets") setCardSetsPath((p) => ({ screen: "hub", level: p.level }));
    setActiveTab(id);
  }

  // The tall low-poly header is only on My Cards; other screens get the compact one.
  const bandHeader = !!session && view === "dashboard" && activeTab === "myCards";

  // Wide screens: My Cards uses the full column, study is 780 px, other screens 720 px (centered).
  const gachaView = view === "gacha" || view === "collection";
  const tabbedView = gachaView || view === "settings"; // full screens that keep the bottom tabs
  const contentWidth = !wide || bandHeader || tabbedView ? "none"
    : view === "study" ? wideLayout.studyWidth : wideLayout.readWidth;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* The theme's background (and backdrop) behind everything; see .app-backdrop in index.css. */}
      <div className="app-backdrop" aria-hidden="true" />
      <div style={wide ? { ...wrap, maxWidth: wideLayout.maxWidth } : wrap}>
        <Header
          variant={bandHeader ? "band" : "compact"} user={session?.user} onSignOut={handleLogout} onHome={goHome} wide={wide}
          gacha={gacha} pulseGacha={gachaPulse} onOpenGacha={openGacha}
          rank={rank} newTheme={hasNewTheme} onOpenSettings={openSettings} onOpenHelp={() => setAboutOpen(true)}
        />

        <div style={{ position: "relative", padding: `0 ${wide ? wideLayout.gutter : gutter}px 60px`, marginTop: bandHeader ? -headerBand.overlap : 0 }}>
          <div style={{ maxWidth: contentWidth, margin: "0 auto" }}>
            {!session ? (
              <LoginScreen error={authError} onGoogleLogin={handleGoogleLogin} onPasswordLogin={handlePasswordLogin} />
            ) : view === "dashboard" ? (
              <div style={{ paddingBottom: tabBarHeight + 32 }}>
                {activeTab === "myCards" && (
                  <MyCardsTab
                    decks={myDecks}
                    dueRows={dueRows}
                    nextReview={dueRows.length === 0 ? nextReviewSummary(nextReview, now) : null}
                    stats={stats}
                    avatar={gacha?.equipped_avatar ?? null}
                    answerMode={answerMode}
                    onOpenCardSets={() => changeTab("cardSets")}
                    onAnswerModeChange={changeAnswerMode}
                    handwritingEnabled={HANDWRITING_ENABLED}
                    sessionSize={sessionSize}
                    onReview={startReview}
                    onOpenPlan={openPlan}
                    onOpenAbout={() => setAboutOpen(true)}
                    onRemove={removeDeck}
                    onOpenMastered={openMastered}
                    loading={loadingDeck}
                    removingDeckId={removingDeckId}
                    wide={wide}
                  />
                )}
                {activeTab === "cardSets" && (
                  <CardSetsTab
                    textbooks={libraryData}
                    loading={loadingLibrary}
                    collections={collectionsData}
                    path={cardSetsPath}
                    onNavigate={navigateCardSets}
                    onOpenDeck={startDeck}
                    myDeckIds={myDeckIds}
                    disabled={loadingDeck}
                  />
                )}
                <Tabs tabs={TABS} active={activeTab} onChange={changeTab} wide={wide} />
                {planOpen && <ReviewPlanSheet rows={planRows} now={now} onClose={closePlan} />}
                {/* New theme unlocked: only on My Cards, never during a review. */}
                {unlock && activeTab === "myCards" && !planOpen && !aboutOpen && (
                  <ThemeUnlockSheet item={unlock.theme} others={unlock.others} rank={rank} onUse={applyUnlockedTheme} onLater={markThemesSeen} />
                )}
              </div>
            ) : tabbedView ? (
              <div style={{ paddingBottom: tabBarHeight + 32 }}>
                {view === "settings" ? (
                  <SettingsScreen
                    themes={themeItems}
                    themesFailed={themesFailed}
                    currentTheme={themeKey}
                    rank={rank}
                    onChooseTheme={(key) => chooseTheme(key).catch(() => {})}
                    themeError={themeError}
                    sessionSize={sessionSize}
                    onSessionSizeChange={changeSessionSize}
                    answerMode={answerMode}
                    onAnswerModeChange={changeAnswerMode}
                    handwritingEnabled={HANDWRITING_ENABLED}
                    reduceMotion={reduceMotion}
                    onReduceMotionChange={changeReduceMotion}
                    lang={lang}
                    onLangChange={changeLang}
                    onBack={() => { setView("dashboard"); window.scrollTo(0, 0); }}
                    wide={wide}
                  />
                ) : view === "gacha" ? (
                  <GachaScreen
                    status={gacha}
                    pulling={pulling}
                    error={gachaError}
                    onPull={pullOnce}
                    onOpenCollection={openCollection}
                    wide={wide}
                  />
                ) : (
                  <GachaCollection
                    rows={collection}
                    equippingId={equippingId}
                    onEquip={equip}
                    onBack={() => setView("gacha")}
                    wide={wide}
                  />
                )}
                {/* Neither tab is highlighted on the gacha and settings screens. */}
                <Tabs tabs={TABS} active={null} onChange={leaveGachaTo} wide={wide} />
                {reveal && (
                  <GachaReveal
                    key={revealKey}
                    result={reveal}
                    equipped={gacha?.equipped_avatar?.id === reveal.avatar.id}
                    equipping={equippingId != null}
                    pulling={pulling}
                    onEquip={equip}
                    onAgain={pullOnce}
                    onClose={() => setReveal(null)}
                  />
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <button onClick={() => setView("dashboard")} style={btnLink}>
                    {t("common.backToDashboard")}
                  </button>
                </div>
                {view === "mastered" && (
                  <MasteredList cards={masteredCards} restoringId={restoringCardId} onRestore={restoreCard} />
                )}
                {activeSet && view === "wordList" && (
                  <WordList
                    key={activeSet.id}
                    activeSet={activeSet}
                    isAdded={myDeckIds.includes(activeSet.id)}
                    saving={savingDeck}
                    onAddDeck={addDeck}
                    onStart={() => beginSession(activeSet)}
                    wide={wide}
                  />
                )}
                {activeSet && view === "study" && (
                  <StudySession
                    key={sessionKey}
                    activeSet={activeSet}
                    isAdded={myDeckIds.includes(activeSet.id)}
                    saving={savingDeck}
                    onAddDeck={addDeck}
                    onBack={() => setView("dashboard")}
                    answerMode={answerMode}
                    wide={wide}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* 使い方 can be opened from the account menu on any screen. */}
      {aboutOpen && <AboutSheet onClose={closeAbout} sessionSize={sessionSize} />}
    </div>
  );
}

export default App;
