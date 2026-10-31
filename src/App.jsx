import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import * as api from './lib/api';
import { buildCards, buildReviewCards } from './lib/drill';
import { loadSchoolLevel, saveSchoolLevel } from './lib/library';
import { packWords, packSummary } from './lib/packOpening';
import { levelCounts, playerRank } from './lib/points';
import { MASTERED, dueByDeck, sessionCardKeys, moreDueCount, nextSetRows } from './lib/srs';
import { HANDWRITING_ENABLED } from './handwriting/config';
import { nextReviewSummary, jstDateKey } from './lib/schedule';
import { singleFlight } from './lib/gacha';
import { openScreen, leaveScreen, reviewKept } from './lib/screens';
import { testLoginEmail, LOGIN_FAILED_MESSAGE } from './lib/login';
import { applyReduceMotion, applyLang, loadThemeCache, saveThemeCache, clearThemeCache, devThemeOverride } from './lib/settings';
import {
  SETTING_DEFAULTS, mergeSettings, settingsPayload, sameSettings, loadDeviceSettings, saveDeviceSettings, clearDeviceSettings,
} from './lib/accountSettings';
import { themeList, newThemes, featuredUnlock, markSeen } from './lib/themeUnlocks';
import { themes, applyTheme, getTheme, DEFAULT_THEME } from './themes';
import { wrap, gutter, headerBand, tabBarHeight, wideLayout } from './styles/theme';
import { useWide, useSideChip, useShort } from './lib/useWide';
import BackButton from './components/BackButton';
import { showTrainingTab, TRAINING_START, letterPracticeId, doneLettersFromProgress } from './lib/training';
import { speechAvailable } from './lib/speech';
import { t } from './i18n';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import Tabs from './components/Tabs';
import TrainingTab from './components/TrainingTab';
import ClassTab from './components/ClassTab';
import AbcPractice from './components/AbcPractice';
import MyCardsTab from './components/MyCardsTab';
import CardSetsTab from './components/CardSetsTab';
import StudySession from './components/StudySession';
import WordList from './components/WordList';
import MasteredList from './components/MasteredList';
import ReviewPlanSheet from './components/ReviewPlanSheet';
import AboutSheet from './components/AboutSheet';
import GachaScreen from './components/GachaScreen';
import GachaReveal from './components/GachaReveal';
import PackOpening from './components/PackOpening';
import GachaCollection from './components/GachaCollection';
import SettingsScreen from './components/SettingsScreen';
import StatsScreen from './components/StatsScreen';
import ThemeUnlockSheet from './components/ThemeUnlockSheet';
import TeacherArea from './components/TeacherArea';
import { TEACHER_START } from './lib/classes';
import { loadLastClass, saveLastClass } from './lib/classTab';
import JoinClassSheet from './components/JoinClassSheet';
import AwardPopup from './components/AwardPopup';

// A theme key from the account or the device; unknown keys become the default theme.
const knownTheme = (key) => (themes[key] ? key : DEFAULT_THEME);

const TABS = [
  { id: 'myCards', label: 'tabs.myCards' },
  { id: 'cardSets', label: 'tabs.cardSets' },
  // トレーニング: only when switched on and it has an activity (src/lib/training.js)
  ...(showTrainingTab() ? [{ id: 'training', label: 'tabs.training' }] : []),
  // クラス: every signed-in user (not in a class yet = a join button)
  { id: 'class', label: 'tabs.class' },
];
// 先生: only for teacher accounts (is_teacher()). Hiding it is only convenience: the database
// checks every teacher action itself.
const TEACHER_TABS = [...TABS, { id: 'teacher', label: 'tabs.teacher' }];

function App() {
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Screens: 'dashboard', 'wordList' (Card Sets deck, before the drill), 'study', 'mastered',
  // 'gacha', 'collection' (ポリアバター図鑑), 'settings' (設定) or 'stats' (学習の記録)
  const [view, setView] = useState("dashboard");
  // The screen settings / stats was opened from, so 戻る returns there (they can stack one level,
  // see src/lib/screens.js). Opened during a review ('study'), the StudySession stays mounted (just
  // hidden) so the review carries on where it was.
  const [settingsFrom, setSettingsFrom] = useState("dashboard");
  const [statsFrom, setStatsFrom] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("myCards"); // always open on My Cards

  // Card Sets (global library)
  const [libraryData, setLibraryData] = useState([]); // textbooks, from shapeLibrary
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [collectionsData, setCollectionsData] = useState(null); // Tests & Themes tree (shapeCollections), null until loaded
  // Which Card Sets screen is open, plus the chosen school level (see src/lib/library.js).
  // Kept here so that coming back from a deck's word list or drill returns to the same deck list.
  // The level starts from the one saved on the last visit.
  const [cardSetsPath, setCardSetsPath] = useState(() => ({ screen: "hub", level: loadSchoolLevel(window.localStorage) }));
  // Training tab: which screen is open (menu / ABC grid / one letter, see src/lib/training.js) and the
  // letters completed in ABCを書こう (a ✓ on the grid): saved on the account and loaded each time
  // the tab opens, merged with the ones completed in this visit.
  const [trainingPath, setTrainingPath] = useState(TRAINING_START);
  const [trainingDone, setTrainingDone] = useState(() => new Set());
  // Teacher area (supabase/polycards-teachers.sql): is this a teacher account (read once after
  // sign-in), which 先生 screen is open, the クラスに参加 pop-up, and the classes the student is in
  // (shown in settings; null while loading, "failed" if they couldn't be read).
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherPath, setTeacherPath] = useState(TEACHER_START);
  const [joinOpen, setJoinOpen] = useState(false);
  const [myClasses, setMyClasses] = useState(null);
  // クラス tab: the class shown, remembered per account on this device ({ userId, classId }).
  const [classChoice, setClassChoice] = useState(null);
  // Tickets from teachers the student hasn't seen yet (my_unseen_awards()): a pop-up on the dashboard.
  const [awardRows, setAwardRows] = useState([]);
  // Assigned packs (Phase 4): how many aren't in My Deck yet (a dot on the クラス tab), the pack being
  // added from the クラス tab, and a counter that makes the クラス tab reload its progress.
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [addingAssignedDeckId, setAddingAssignedDeckId] = useState(null);
  const [assignmentsVersion, setAssignmentsVersion] = useState(0);
  // Settings saved on the account with a copy on the device (src/lib/accountSettings.js). They start
  // from the device's copy (main.jsx already applied its language and reduce motion); after sign-in
  // the account's version wins. settingsRef always holds the newest, so quick changes stack.
  const [settings, setSettings] = useState(() => loadDeviceSettings(window.localStorage, HANDWRITING_ENABLED));
  const settingsRef = useRef(settings);
  // Account sync: which account the settings were synced with (changes are saved there only after
  // that), and whether the last save failed (then the device's version is sent at the next sync
  // instead of being replaced by the older one on the account).
  const settingsSync = useRef({ userId: null, unsaved: false });
  const { answerMode, sessionSize, reduceMotion, autoPlay, slowSpeech, lang } = settings; // 答え方, 1回の枚数, カードの動きを減らす, 自動再生, ゆっくり, 言語
  // Settings: shown at once and copied to the device. The language is switched before the re-render,
  // so every text is looked up in the new one.
  const showSettings = useCallback((next) => {
    settingsRef.current = next;
    applyLang(next.lang);
    saveDeviceSettings(window.localStorage, next);
    setSettings(next);
  }, []);

  // Log-out: back to the default settings, on the screen and on the device (see clearDeviceSettings).
  const resetSettings = useCallback(() => {
    settingsSync.current = { userId: null, unsaved: false };
    showSettings(SETTING_DEFAULTS);
    clearDeviceSettings(window.localStorage);
  }, [showSettings]);
  const [canSpeak] = useState(() => speechAvailable()); // no speech in this browser: no speaker buttons
  const speech = canSpeak ? { autoPlay, slow: slowSpeech } : null;

  // Theme: saved on the account (gacha_set_theme), cached on the device. main.jsx already applied the cache.
  const [themeKey, setThemeKey] = useState(() => knownTheme(loadThemeCache(window.localStorage)));
  const [themeRows, setThemeRows] = useState(null); // theme_unlocks rows, read once after sign-in (null while loading)
  const [themesFailed, setThemesFailed] = useState(false);
  const [themeError, setThemeError] = useState(null); // save error shown in settings
  // Unlocked themes this student has already been told about: saved on the account
  // (seen_theme_unlocks), read once after sign-in. null until loaded (or if it can't be read):
  // then no pop-up and no dot, so a failed load never shows an old pop-up again.
  const [seenSaved, setSeenSaved] = useState(null); // { userId, keys }
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
  const [aboutOpen, setAboutOpen] = useState(false); // "What is Polycards?" pop-up: true, or "teacher" = opened at the 先生用ガイド
  const [savingDeck, setSavingDeck] = useState(false);
  const [packResult, setPackResult] = useState(null); // pack opening after Add to My Cards (packSummary)
  const [packFromClass, setPackFromClass] = useState(false); // the pack was added from the クラス tab (課題)
  // Where the open word list came from: 'cardSets' (Word Packs) or 'class' (課題's 単語を見る: no drill,
  // and its back button says クラスにもどる).
  const [wordListFrom, setWordListFrom] = useState("cardSets");
  const [removingDeckId, setRemovingDeckId] = useState(null);
  const [stats, setStats] = useState(null); // points and rank
  const [masteredCards, setMasteredCards] = useState([]);
  const [restoringCardId, setRestoringCardId] = useState(null);

  // Stats page (学習の記録): { days, totals, trouble }, null while loading
  const [statsData, setStatsData] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const statsLoad = useRef(0); // only the newest load is shown

  // Gacha (tickets and avatars come only from the database functions, see api.js)
  const [gacha, setGacha] = useState(null); // gacha_status, null while loading
  const [gachaPulse, setGachaPulse] = useState(false); // one pulse of the header button
  const pulseChecked = useRef(false); // the pulse is only for the first status after sign-in
  const [pulling, setPulling] = useState(false);
  const [gachaError, setGachaError] = useState(null);
  const [reveal, setReveal] = useState(null); // gacha_pull result being shown
  const [revealKey, setRevealKey] = useState(0); // new reveal animation for each pull
  const [collection, setCollection] = useState(null); // gacha_collection rows
  const [collectionFrom, setCollectionFrom] = useState("gacha"); // where the collection was opened: 'gacha' or 'dashboard'
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
  const sideChip = useSideChip(); // room for the review's "previous card" chip beside the card
  const short = useShort(); // short screen (landscape iPad with browser bars): the review tightens up
  const [studyTyping, setStudyTyping] = useState(false); // the review's typing box is open

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        setMyDeckIds([]); setMyDecks([]); setStats(null);
        setGacha(null); setReveal(null); setCollection(null); pulseChecked.current = false;
        setThemeRows(null); setThemesFailed(false); setSeenSaved(null);
        setIsTeacher(false); setMyClasses(null); setJoinOpen(false); setAwardRows([]); setPendingAssignments(0);
      }
      // Log-out: forget this account's theme and settings on the device and go back to Midnight
      // and the default settings.
      if (event === "SIGNED_OUT") {
        clearThemeCache(window.localStorage);
        setThemeKey(DEFAULT_THEME);
        resetSettings();
      }
    });
    return () => subscription.unsubscribe();
  }, [resetSettings]);

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

  // Teacher account? Read once after sign-in (an error counts as no; a late answer for another
  // account is ignored).
  useEffect(() => {
    if (!userId) return;
    let current = true;
    api.fetchIsTeacher().then((yes) => { if (current) setIsTeacher(yes); });
    return () => { current = false; };
  }, [userId]);

  // The classes the student is in, loaded each time settings opens (and after joining one).
  const loadMyClasses = useCallback(() => {
    api.fetchMyClasses()
      .then(setMyClasses)
      .catch((e) => { console.error(e); setMyClasses("failed"); });
  }, []);
  useEffect(() => {
    if (userId && (view === "settings" || (view === "dashboard" && activeTab === "class"))) loadMyClasses();
  }, [userId, view, activeTab, loadMyClasses]);

  // クラス tab: choosing a class (the picker, or the class just joined) remembers it on this device.
  const chooseClass = useCallback((classId) => {
    setClassChoice({ userId, classId });
    saveLastClass(window.localStorage, userId, classId);
  }, [userId]);
  const chosenClassId = classChoice?.userId === userId ? classChoice.classId : loadLastClass(window.localStorage, userId);

  // クラス tab: the student left a class. The list reloads (pickClass() then shows the first class
  // left, or the no-class panel) and the 課題 dot is counted again.
  const leftClass = useCallback(() => {
    loadMyClasses();
    api.fetchPendingAssignments().then(setPendingAssignments);
  }, [loadMyClasses]);

  // The seen-themes list, read once after sign-in (a late answer for another account is ignored).
  useEffect(() => {
    if (!userId) return;
    let current = true;
    api.fetchSeenThemeUnlocks()
      .then((keys) => { if (current) setSeenSaved({ userId, keys }); })
      .catch((e) => console.error(e));
    return () => { current = false; };
  }, [userId]);

  // Saves the whole settings object on the account (in order; a failure is sent again at the next sync).
  const pushSettings = useCallback((id, next) => {
    api.saveUserSettings(id, settingsPayload(next))
      .then(() => { if (settingsSync.current.userId === id) settingsSync.current.unsaved = false; })
      .catch((e) => {
        console.error(e);
        if (settingsSync.current.userId === id) settingsSync.current.unsaved = true;
      });
  }, []);

  // Syncs the settings with the account: after sign-in (also when the app opens already signed in)
  // and whenever the app comes back into view, so a change made on another device shows up here.
  // No row yet = the device's settings are uploaded; otherwise the account's version wins.
  const signedInAs = useRef(null);
  useEffect(() => { signedInAs.current = userId; }, [userId]);
  const syncSettings = useCallback(async () => {
    if (!userId) return;
    await api.waitForSettingsSaves();
    const sync = settingsSync.current;
    if (sync.userId === userId && sync.unsaved) {
      pushSettings(userId, settingsRef.current); // the account still has an older version
      return;
    }
    let account;
    try {
      account = await api.fetchUserSettings();
    } catch (e) {
      console.error(e); // keep the device's settings; the next sync tries again
      return;
    }
    if (signedInAs.current !== userId) return;
    if (account === null) {
      try {
        await api.createUserSettings(userId, settingsPayload(settingsRef.current));
      } catch (e) {
        console.error(e);
        return;
      }
    } else {
      const next = mergeSettings(settingsRef.current, account, HANDWRITING_ENABLED);
      if (!sameSettings(next, settingsRef.current)) showSettings(next);
    }
    if (signedInAs.current === userId) settingsSync.current = { userId, unsaved: false };
  }, [userId, showSettings, pushSettings]);
  useEffect(() => {
    if (!userId) return;
    syncSettings();
    const onVisible = () => { if (document.visibilityState === "visible") syncSettings(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, syncSettings]);

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
    if (session && view === "dashboard") loadStats();
  }, [session, view]);

  // Gacha status: when the app opens, after every review (the dashboard is shown again),
  // when the gacha screen opens, and whenever the app comes back into view.
  useEffect(() => {
    if (session && (view === "dashboard" || view === "gacha")) loadGacha();
  }, [session, view]);

  // Tickets from teachers: checked at the same moments as the gacha status (never throws). The
  // assigned packs not added yet (the クラス tab's dot) are checked at the same moments.
  const loadAwards = useCallback(() => {
    api.fetchUnseenAwards().then(setAwardRows);
    api.fetchPendingAssignments().then(setPendingAssignments);
  }, []);
  useEffect(() => {
    if (session && view === "dashboard") loadAwards();
  }, [session, view, loadAwards]);

  useEffect(() => {
    if (!session) return;
    const onVisible = () => { if (document.visibilityState === "visible") { loadGacha(); loadAwards(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session, loadAwards]);

  // The award pop-up was closed (とじる) or ガチャへ was pressed: exactly the awards it showed are
  // marked seen, and the gacha status reloads so the ticket badge shows them.
  function closeAwards(toGacha) {
    const ids = awardRows.map((a) => a.id);
    setAwardRows([]);
    api.markAwardsSeen(ids).then(loadGacha);
    if (toGacha) openGacha();
  }
  const showAwards = !!session && view === "dashboard" && awardRows.length > 0 && !planOpen && !aboutOpen && !packResult && !joinOpen;

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

  // One setting changed: shown at once, saved on the device, and on the account once synced.
  function changeSetting(key, value) {
    const next = { ...settingsRef.current, [key]: value };
    showSettings(next);
    const sync = settingsSync.current;
    if (userId && sync.userId === userId) pushSettings(userId, next);
  }

  const changeAnswerMode = (mode) => changeSetting("answerMode", mode);
  const changeSessionSize = (size) => changeSetting("sessionSize", size);
  const changeReduceMotion = (on) => changeSetting("reduceMotion", on);
  const changeAutoPlay = (on) => changeSetting("autoPlay", on);
  const changeSlowSpeech = (on) => changeSetting("slowSpeech", on);
  // 言語 / Language: switches every text at once (the state change re-renders the whole app).
  const changeLang = (next) => changeSetting("lang", next);

  // Themes: unlocked by rank (the one the player card shows); "new" = unlocked but not yet shown.
  const rank = stats?.playerRank ?? null;
  const themeItems = useMemo(() => (themeRows ? themeList(themeRows, themes) : null), [themeRows]);
  // Nothing counts as new until the seen list (saved on the account) has loaded.
  const seenThemes = seenSaved?.userId === userId ? seenSaved.keys : null;
  const themesReady = !!themeItems && rank != null && !!seenThemes;
  const hasNewTheme = themesReady && newThemes(themeItems, rank, seenThemes).length > 0;
  const unlock = themesReady ? featuredUnlock(themeItems, rank, seenThemes) : null;

  // Every theme unlocked now counts as seen (the dot and the pop-up go away at once), then the
  // new keys are saved on the account. If saving fails, they only stay seen for this visit.
  function markThemesSeen() {
    if (!themesReady || !userId) return;
    const keys = markSeen(themeItems, rank, seenThemes);
    const added = keys.filter((k) => !seenThemes.includes(k));
    if (!added.length) return;
    setSeenSaved({ userId, keys });
    api.markThemeUnlocksSeen(added).catch((e) => console.error(e));
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
    showScreen(openScreen(screens, "settings"));
  }

  // Settings and stats: which one is open and where each was opened from (src/lib/screens.js).
  const screens = { view, settingsFrom, statsFrom };
  function showScreen(next) {
    setSettingsFrom(next.settingsFrom);
    setStatsFrom(next.statsFrom);
    setView(next.view);
    window.scrollTo(0, 0);
  }

  // 戻る in settings or stats: back one step (a review behind them continues where it was).
  function leaveScreenNow() {
    setView(leaveScreen(screens, !!activeSet));
    window.scrollTo(0, 0);
  }

  // Settings and stats are full pages, but students tap the empty space beside them (the page
  // background, side gutters and margins, all marked data-page-space) to close them, as with a
  // pop-up: such a tap works like 戻る. A tap on anything else (panels, header, tabs, pop-ups) is not
  // on one of those elements, so it does nothing here.
  function leaveOnEmptySpace(e) {
    if (view !== "settings" && view !== "stats") return;
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-page-space")) return;
    leaveScreenNow();
  }

  // 学習の記録: open the page at once (読み込み中…), then load the days, totals and trouble words.
  // Shown again from settings (settings was opened on it), it keeps the data it has.
  async function openStats() {
    setPlanOpen(false);
    setAboutOpen(false);
    setReveal(null);
    const next = openScreen(screens, "stats");
    showScreen(next);
    if (!next.reload) return;
    const load = ++statsLoad.current;
    setStatsData(null);
    setStatsError(null);
    try {
      await api.waitForPendingSaves(); // include the answers just given
      const [days, totals, trouble] = await Promise.all([api.fetchStudyDays(), api.fetchStudyTotals(), api.fetchTroubleWords()]);
      if (load === statsLoad.current) setStatsData({ days, totals, trouble });
    } catch (e) {
      console.error(e);
      if (load === statsLoad.current) setStatsError(e.message);
    }
  }

  // Unlock pop-up: 今すぐ使う saves the theme first (the pop-up stays open if that fails).
  async function applyUnlockedTheme() {
    await chooseTheme(unlock.theme.key);
    markThemesSeen();
  }

  // The peak is calculated and saved by the database (a trigger on user_cards, see
  // supabase/polycards-server-peak-points.sql); the app only reads it.
  async function loadStats() {
    try {
      await api.waitForPendingSaves(); // include the last answers of a review that just ended
      const [levels, peakPoints, bonusPoints] = await Promise.all([
        api.fetchAllCardLevels(),
        api.fetchPeakPoints(),
        // The spelling bonus only adds to rank; if it can't be read, show the rest anyway.
        api.fetchBonusPoints().catch((e) => { console.error(e); return 0; }),
      ]);
      setStats({
        peakPoints, bonusPoints,
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

  // from: 'gacha' (the gacha screen's link) or 'dashboard' (the avatar on the player card).
  async function openCollection(from = "gacha") {
    setCollectionFrom(from);
    setCollection(null);
    setView("collection");
    window.scrollTo(0, 0);
    try {
      setCollection(await api.fetchGachaCollection());
    } catch (e) {
      alert(e.message);
      leaveCollection(from);
    }
  }

  // Back from the collection to where it was opened: the gacha screen, or the My Cards dashboard.
  function leaveCollection(from = collectionFrom) {
    if (from === "dashboard") {
      setView("dashboard");
      setActiveTab("myCards");
      window.scrollTo(0, 0);
    } else {
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
    // A review's held まだ / わかった answer must be saved while still signed in.
    api.flushHeldAnswer();
    await api.waitForPendingSaves();
    await supabase.auth.signOut();
    clearThemeCache(window.localStorage); // also done on SIGNED_OUT; here too in case that event is missed
    setThemeKey(DEFAULT_THEME);
    resetSettings();
    goHome(); // the next sign-in starts on My Cards too
    setTrainingDone(new Set());
  };

  // Logo: back to the My Cards dashboard, with Card Sets reset to its hub (the school level is kept).
  // Leaving a review loses nothing: answers are saved as they are given, and the last まだ / わかった
  // (held so it can be undone) is sent when StudySession closes.
  function goHome() {
    setPlanOpen(false);
    setAboutOpen(false);
    setReveal(null);
    setView("dashboard");
    setActiveTab("myCards");
    setCardSetsPath((p) => ({ screen: "hub", level: p.level }));
    setTrainingPath(TRAINING_START);
    setTeacherPath(TEACHER_START);
    setJoinOpen(false);
    window.scrollTo(0, 0);
  }

  function beginSession(set) {
    setActiveSet(set);
    setSessionKey((k) => k + 1);
    setView("study");
  }

  // Card Sets: open a deck's word list; the "try it" drill starts from there.
  // from: 'class' when opened with 単語を見る on a 課題 card.
  async function startDeck(deck, from = "cardSets") {
    setLoadingDeck(true);
    try {
      const words = await api.fetchDeckWords(deck.id);
      if (words.length === 0) throw new Error();
      // Which words the student already has (所持済み tags and the add button's counts).
      // Checked before the list shows, so the tags never make rows jump; null = unknown.
      const ownedWordIds = await api.fetchOwnedWordIds(session?.user?.id, words.map((w) => w.id));
      setActiveSet({ id: deck.id, name: deck.name, cards: buildCards(words), ownedWordIds });
      setWordListFrom(from);
      setView("wordList");
      window.scrollTo(0, 0);
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
        beginSession(reviewSet(deck, rows));
      }
    } catch (e) {
      alert(e.message);
    }
    setLoadingDeck(false);
  }

  // A review session's set. deck: the pack reviewed, or null for every pack (kept for 続けて復習する).
  function reviewSet(deck, rows) {
    return { id: deck?.id || 'review', name: deck?.name || t("review.defaultName"), cards: buildReviewCards(rows), mode: 'srs', deck: deck || null };
  }

  // 全部クリア panel: how many cards are due now (same pack, or every pack), not counting the
  // cards of the review that just ended (their last answers may still be saving or held for undo).
  async function countMoreDue() {
    const skip = sessionCardKeys(activeSet?.cards);
    return moreDueCount(await api.fetchDueRows(), activeSet?.deck?.id || null, skip);
  }

  // 続けて復習する: saves the held last answer and waits for every save, then starts the next set
  // of the same review, leaving out the cards just reviewed.
  async function continueReview() {
    if (!session || !activeSet) return;
    const deck = activeSet.deck || null;
    const skip = sessionCardKeys(activeSet.cards);
    setLoadingDeck(true);
    try {
      api.flushHeldAnswer();
      await api.waitForPendingSaves();
      const rows = nextSetRows(await api.fetchReviewRows(deck?.id, sessionSize + skip.size), skip, sessionSize);
      if (rows.length === 0) {
        alert(t("myCards.nothingDueAlert"));
      } else {
        beginSession(reviewSet(deck, rows));
        window.scrollTo(0, 0);
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

  // Adds a pack to My Cards and plays the pack opening. set: { id, name, cards } (the word list's
  // activeSet, or one built for an assigned pack). Returns true when it was added.
  async function addPack(set) {
    if (!session) {
      alert(t("cardSets.signInToAdd"));
      return false;
    }
    if (!set) return false;
    setSavingDeck(true);
    let added = false;
    try {
      const { wordIds, ownedWordIds } = await api.addDeckToMyCards(session.user.id, set.id);
      setPackResult(packSummary(packWords(set.cards), ownedWordIds));
      // Every word of the deck is owned now.
      setActiveSet((current) => (current && current.id === set.id ? { ...current, ownedWordIds: wordIds } : current));
      await loadMyDecks();
      added = true;
    } catch (e) {
      alert(e.message);
    }
    setSavingDeck(false);
    return added;
  }

  // The word list's (and drill's) ＋ マイデッキに追加. From a 課題's 単語を見る, the クラス tab's progress and
  // dot reload afterwards, and the pack opening's 今すぐ復習する comes back to クラス.
  async function addDeck() {
    const fromClass = view === "wordList" && wordListFrom === "class";
    setPackFromClass(fromClass);
    const added = await addPack(activeSet);
    if (added && fromClass) {
      setAssignmentsVersion((v) => v + 1);
      api.fetchPendingAssignments().then(setPendingAssignments);
    }
    return added;
  }

  // クラス tab, 課題: ＋ マイデッキに追加 runs the same add (with the pack opening) for an assigned pack,
  // then the クラス tab reloads its progress and the dot is checked again. The tab stays on クラス.
  async function addAssignedPack(assignment) {
    if (addingAssignedDeckId) return;
    setAddingAssignedDeckId(assignment.deck_id);
    try {
      const words = await api.fetchDeckWords(assignment.deck_id);
      if (words.length === 0) throw new Error(t("cardSets.deckEmpty"));
      const set = { id: assignment.deck_id, name: assignment.deck_name, cards: buildCards(words), ownedWordIds: null };
      setActiveSet(set);
      setPackFromClass(true);
      if (await addPack(set)) {
        setAssignmentsVersion((v) => v + 1);
        api.fetchPendingAssignments().then(setPendingAssignments);
      }
    } catch (e) {
      alert(e.message);
    }
    setAddingAssignedDeckId(null);
  }

  // クラス tab, 課題: 単語を見る opens the pack's word list (no drill; back = クラスにもどる).
  function viewAssignedWords(assignment) {
    startDeck({ id: assignment.deck_id, name: assignment.deck_name }, "class");
  }

  // クラス tab, 課題: 復習する reviews this pack's due cards; leaving the review comes back to クラス.
  function reviewAssigned(assignment) {
    startReview({ id: assignment.deck_id, name: assignment.deck_name });
  }

  const closePack = useCallback(() => setPackResult(null), []);

  // Word list / pack opening: to the My Cards dashboard. cardSetsPath is kept, so the Card Sets
  // tab still comes back to the same deck list.
  function goToMyDeck() {
    setPackResult(null);
    setView("dashboard");
    setActiveTab("myCards");
    window.scrollTo(0, 0);
  }

  // Pack opening: 今すぐ復習する reviews this pack's due cards (its new words are due at once).
  // The tab switches first, so leaving the review lands on My Cards (EXP, tickets); a pack added
  // from the クラス tab (課題) comes back to the クラス tab instead.
  function reviewPack() {
    if (!activeSet) return;
    setPackResult(null);
    if (!packFromClass) setActiveTab("myCards");
    startReview({ id: activeSet.id, name: activeSet.name });
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
    await Promise.all([loadMyDecks(), loadDueRows(), loadStats()]);
    setRemovingDeckId(null);
  }

  // Each Card Sets screen starts at the top of the page. The school level is saved for next visit.
  function navigateCardSets(path) {
    if (path.level !== cardSetsPath.level) saveSchoolLevel(window.localStorage, path.level);
    setCardSetsPath(path);
    window.scrollTo(0, 0);
  }

  // Each 先生 screen starts at the top of the page.
  function navigateTeacher(path) {
    setTeacherPath(path);
    window.scrollTo(0, 0);
  }

  // Each Training screen starts at the top of the page.
  function navigateTraining(path) {
    setTrainingPath(path);
    window.scrollTo(0, 0);
  }

  // A letter in ABCを書こう got all 4 boxes green: a ✓ on the grid at once, and saved on the account
  // (if saving fails, the ✓ only lasts for this visit).
  const completeLetter = useCallback((letter) => {
    setTrainingDone((done) => (done.has(letter) ? done : new Set(done).add(letter)));
    api.recordTrainingCompletion(letterPracticeId(letter)).catch((e) => console.error(e));
  }, []);

  // Opening the Training tab loads the saved progress and adds it to the ✓ marks (never removes
  // one, so a letter just completed stays even if its save hasn't finished).
  useEffect(() => {
    if (!userId || activeTab !== "training") return;
    let current = true;
    api.fetchTrainingProgress()
      .then((rows) => {
        if (!current) return;
        const saved = doneLettersFromProgress(rows);
        setTrainingDone((done) => (Array.from(saved).every((l) => done.has(l)) ? done : new Set([...done, ...saved])));
      })
      .catch((e) => console.error(e));
    return () => { current = false; };
  }, [userId, activeTab]);

  // Tapping Card Sets (or Training, or 先生) while already on it goes back to its first screen.
  function changeTab(id) {
    if (id === "cardSets" && activeTab === "cardSets") setCardSetsPath((p) => ({ screen: "hub", level: p.level }));
    if (id === "training" && activeTab === "training") setTrainingPath(TRAINING_START);
    if (id === "teacher" && activeTab === "teacher") setTeacherPath((p) => ({ ...TEACHER_START, archived: p.archived }));
    setActiveTab(id);
  }

  // The tall low-poly header is only on My Cards; other screens get the compact one.
  const bandHeader = !!session && view === "dashboard" && activeTab === "myCards";

  // Wide screens: My Cards uses the full column, study is 780 px, other screens 720 px (centered).
  const gachaView = view === "gacha" || view === "collection";
  const tabbedView = gachaView || view === "settings" || view === "stats"; // full screens that keep the bottom tabs
  // Settings or stats opened during a review: the review is kept (hidden) underneath and comes back on 戻る.
  const reviewBehind = tabbedView && !gachaView && reviewKept(screens, !!activeSet);
  // The review fills exactly one screen (.study-page in index.css), so its buttons always fit; while
  // the typing box is open the page may grow, for the on-screen keyboard.
  const studyFit = !!session && view === "study";
  const fill = studyFit ? "study-fill" : undefined;
  const tabs = isTeacher ? TEACHER_TABS : TABS;
  const tabDots = { class: pendingAssignments > 0 }; // an assigned pack not in My Deck yet
  const dueCounts = dueByDeck(dueRows); // due cards per pack (課題's 復習する)
  const teacherTab = view === "dashboard" && activeTab === "teacher";
  const contentWidth = !wide || bandHeader || teacherTab ? "none"
    : view === "stats" ? wideLayout.readWidth
    : tabbedView ? "none"
    : view === "study" ? wideLayout.studyWidth : wideLayout.readWidth;

  return (
    <div
      className={studyFit ? `study-page${studyTyping ? " study-typing" : ""}` : undefined}
      style={studyFit ? undefined : { minHeight: "100vh" }}
      data-page-space=""
      onClick={leaveOnEmptySpace}
    >
      {/* The theme's background (and backdrop) behind everything; see .app-backdrop in index.css. */}
      <div className="app-backdrop" aria-hidden="true" />
      <div className={fill} style={wide ? { ...wrap, maxWidth: wideLayout.maxWidth } : wrap} data-page-space="">
        <Header
          variant={bandHeader ? "band" : "compact"} user={session?.user} onSignOut={handleLogout} onHome={goHome} wide={wide}
          gacha={gacha} pulseGacha={gachaPulse} onOpenGacha={openGacha}
          rank={rank} newTheme={hasNewTheme} onOpenStats={openStats} onOpenSettings={openSettings} onOpenHelp={() => setAboutOpen(true)}
          onOpenJoinClass={() => setJoinOpen(true)}
          tight={studyFit && short}
        />

        <div
          className={fill}
          data-page-space=""
          style={{
            position: "relative", marginTop: bandHeader ? -headerBand.overlap : 0,
            padding: `0 ${wide ? wideLayout.gutter : gutter}px ${studyFit ? "calc(12px + env(safe-area-inset-bottom))" : "60px"}`,
          }}
        >
          <div className={fill} style={{ maxWidth: contentWidth, width: "100%", margin: "0 auto" }} data-page-space="">
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
                    onOpenCollection={() => openCollection("dashboard")}
                    onOpenStats={openStats}
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
                {activeTab === "training" && (
                  trainingPath.screen === "menu" ? (
                    <TrainingTab wide={wide} onOpen={(id) => { if (id === "abc") navigateTraining({ ...trainingPath, screen: "abc" }); }} />
                  ) : (
                    <AbcPractice path={trainingPath} onNavigate={navigateTraining} done={trainingDone} onComplete={completeLetter} />
                  )
                )}
                {activeTab === "class" && (
                  <ClassTab
                    classes={myClasses} selectedId={chosenClassId} onSelect={chooseClass} onJoin={() => setJoinOpen(true)} wide={wide}
                    onLeft={leftClass}
                    assignmentsVersion={assignmentsVersion}
                    dueFor={(deckId) => dueCounts[deckId] || 0}
                    busyDeckId={addingAssignedDeckId}
                    onAddAssignment={addAssignedPack}
                    onReviewAssignment={reviewAssigned}
                    onViewAssignmentWords={viewAssignedWords}
                  />
                )}
                {activeTab === "teacher" && isTeacher && (
                  <TeacherArea
                    path={teacherPath} onNavigate={navigateTeacher} wide={wide}
                    library={libraryData} collections={collectionsData} libraryLoading={loadingLibrary}
                    onOpenGuide={() => setAboutOpen("teacher")}
                  />
                )}
                <Tabs tabs={tabs} active={activeTab} onChange={changeTab} wide={wide} dots={tabDots} />
                {planOpen && <ReviewPlanSheet rows={planRows} now={now} onClose={closePlan} />}
                {/* New theme unlocked: only on My Cards, never during a review. */}
                {unlock && activeTab === "myCards" && !planOpen && !aboutOpen && !showAwards && (
                  <ThemeUnlockSheet item={unlock.theme} others={unlock.others} rank={rank} onUse={applyUnlockedTheme} onLater={markThemesSeen} />
                )}
              </div>
            ) : null}
            {session && tabbedView && (
              <div style={{ paddingBottom: tabBarHeight + 32 }}>
                {view === "stats" ? (
                  <StatsScreen data={statsData} error={statsError} today={jstDateKey(Date.now())} onBack={leaveScreenNow} masteredCount={stats?.levelCounts?.[MASTERED] ?? 0} wide={wide} />
                ) : view === "settings" ? (
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
                    canSpeak={canSpeak}
                    autoPlay={autoPlay}
                    onAutoPlayChange={changeAutoPlay}
                    slowSpeech={slowSpeech}
                    onSlowSpeechChange={changeSlowSpeech}
                    lang={lang}
                    onLangChange={changeLang}
                    classes={myClasses}
                    onJoinClass={() => setJoinOpen(true)}
                    onBack={leaveScreenNow}
                    wide={wide}
                  />
                ) : view === "gacha" ? (
                  <GachaScreen
                    status={gacha}
                    pulling={pulling}
                    error={gachaError}
                    onPull={pullOnce}
                    onOpenCollection={() => openCollection("gacha")}
                    wide={wide}
                  />
                ) : (
                  <GachaCollection
                    rows={collection}
                    equippingId={equippingId}
                    onEquip={equip}
                    from={collectionFrom}
                    onBack={() => leaveCollection()}
                    wide={wide}
                  />
                )}
                {/* Neither tab is highlighted on the gacha, settings and stats screens. */}
                <Tabs tabs={tabs} active={null} onChange={leaveGachaTo} wide={wide} dots={tabDots} />
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
            )}
            {session && (!tabbedView || reviewBehind) && view !== "dashboard" && (
              <div className={fill} style={reviewBehind ? { display: "none" } : undefined}>
                {/* The review has its back button in its own top row. */}
                {view !== "study" && (
                  <div style={{ marginBottom: 14, textAlign: "left" }}>
                    <BackButton
                      label={t(view === "wordList" && wordListFrom === "class" ? "common.backToClass" : "common.backToDashboard")}
                      onClick={() => setView("dashboard")}
                    />
                  </div>
                )}
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
                    onGoToMyDeck={goToMyDeck}
                    wide={wide}
                    speech={speech}
                    showDrill={wordListFrom !== "class"}
                  />
                )}
                {activeSet && (view === "study" || reviewBehind) && (
                  <StudySession
                    key={sessionKey}
                    activeSet={activeSet}
                    isAdded={myDeckIds.includes(activeSet.id)}
                    saving={savingDeck}
                    onAddDeck={addDeck}
                    onBack={() => setView("dashboard")}
                    countMoreDue={countMoreDue}
                    onContinue={continueReview}
                    continuing={loadingDeck}
                    sessionSize={sessionSize}
                    answerMode={answerMode}
                    onAnswerModeChange={changeAnswerMode}
                    wide={wide}
                    sideChip={sideChip}
                    speech={speech}
                    onAutoPlayChange={changeAutoPlay}
                    fit={studyFit}
                    short={short}
                    onTypingOpen={setStudyTyping}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 使い方 can be opened from the account menu on any screen. */}
      {aboutOpen && <AboutSheet onClose={closeAbout} sessionSize={sessionSize} isTeacher={isTeacher} focus={aboutOpen === "teacher" ? "teacher" : null} />}
      {session && joinOpen && (
        <JoinClassSheet onClose={() => setJoinOpen(false)} onJoined={(joined) => { if (joined?.id) chooseClass(joined.id); loadMyClasses(); }} />
      )}
      {showAwards && <AwardPopup awards={awardRows} onGacha={() => closeAwards(true)} onClose={() => closeAwards(false)} />}
      {packResult && <PackOpening summary={packResult} onClose={closePack} onReview={reviewPack} onGoToMyDeck={goToMyDeck} />}
    </div>
  );
}

export default App;
