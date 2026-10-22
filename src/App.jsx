import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import * as api from './lib/api';
import { buildCards, buildReviewCards } from './lib/drill';
import { loadSchoolLevel, saveSchoolLevel } from './lib/library';
import { totalPoints, levelCounts, playerRank, newPeak } from './lib/points';
import { loadAnswerMode, saveAnswerMode } from './lib/spelling';
import { HANDWRITING_ENABLED } from './handwriting/config';
import { nextReviewSummary } from './lib/schedule';
import { singleFlight } from './lib/gacha';
import { colors, wrap, gutter, headerBand, tabBarHeight, btnLink, wideLayout } from './styles/theme';
import { useWide } from './lib/useWide';
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

const TABS = [
  { id: 'myCards', label: 'My Cards' },
  { id: 'cardSets', label: 'Card Sets' },
];

function App() {
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Screens: 'dashboard', 'wordList' (Card Sets deck, before the drill), 'study', 'mastered',
  // 'gacha' or 'collection' (アバター図鑑)
  const [view, setView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("myCards"); // always open on My Cards

  // Card Sets (global library)
  const [libraryData, setLibraryData] = useState([]); // textbooks, from shapeLibrary
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  // Which Card Sets screen is open, plus the chosen school level (see src/lib/library.js).
  // Kept here so that coming back from a deck's word list or drill returns to the same deck list.
  // The level starts from the one saved on the last visit.
  const [cardSetsPath, setCardSetsPath] = useState(() => ({ screen: "hub", level: loadSchoolLevel(window.localStorage) }));
  const [answerMode, setAnswerMode] = useState(() => loadAnswerMode(window.localStorage, HANDWRITING_ENABLED)); // 答え方: off / typing / handwriting

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMyDeckIds([]); setMyDecks([]); setStats(null);
        setGacha(null); setReveal(null); setCollection(null); pulseChecked.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      const t = Date.now();
      setNow(t);
      if (t >= nextReview.at) loadDueRows();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
      alert("No cards found in this deck yet!");
    }
    setLoadingDeck(false);
  }

  // My Cards: SRS review of due cards (all decks, or one deck)
  async function startReview(deck = null) {
    if (!session) return;
    setLoadingDeck(true);
    try {
      const rows = await api.fetchReviewRows(deck?.id);
      if (rows.length === 0) {
        alert("今は復習するカードがありません。(Nothing is due right now.)");
      } else {
        beginSession({ id: deck?.id || 'review', name: deck?.name || '復習 (Review)', cards: buildReviewCards(rows), mode: 'srs' });
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
      alert("Sign in with Google to save decks to My Cards.");
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
    if (!window.confirm(`「${deck.name}」をマイカードから削除しますか？\nRemove "${deck.name}" from My Cards? Your review progress for this deck will be lost.`)) return;
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
  const contentWidth = !wide || bandHeader || gachaView ? "none"
    : view === "study" ? wideLayout.studyWidth : wideLayout.readWidth;

  return (
    <div style={{ background: colors.bg, minHeight: "100vh" }}>
      <div style={wide ? { ...wrap, maxWidth: wideLayout.maxWidth } : wrap}>
        <Header
          variant={bandHeader ? "band" : "compact"} user={session?.user} onSignOut={handleLogout} onHome={goHome} wide={wide}
          gacha={gacha} pulseGacha={gachaPulse} onOpenGacha={openGacha}
        />

        <div style={{ position: "relative", padding: `0 ${wide ? wideLayout.gutter : gutter}px 60px`, marginTop: bandHeader ? -headerBand.overlap : 0 }}>
          <div style={{ maxWidth: contentWidth, margin: "0 auto" }}>
            {!session ? (
              <LoginScreen error={authError} onGoogleLogin={handleGoogleLogin} />
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
                    onAnswerModeChange={changeAnswerMode}
                    handwritingEnabled={HANDWRITING_ENABLED}
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
                    path={cardSetsPath}
                    onNavigate={navigateCardSets}
                    onOpenDeck={startDeck}
                    myDeckIds={myDeckIds}
                    disabled={loadingDeck}
                  />
                )}
                <Tabs tabs={TABS} active={activeTab} onChange={changeTab} wide={wide} />
                {planOpen && <ReviewPlanSheet rows={planRows} now={now} onClose={closePlan} />}
                {aboutOpen && <AboutSheet onClose={closeAbout} />}
              </div>
            ) : gachaView ? (
              <div style={{ paddingBottom: tabBarHeight + 32 }}>
                {view === "gacha" ? (
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
                {/* Neither tab is highlighted on the gacha screens. */}
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
                    ← ダッシュボードに戻る (Back to Dashboard)
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
    </div>
  );
}

export default App;
