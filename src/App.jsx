import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import * as api from './lib/api';
import { buildCards, buildReviewCards } from './lib/drill';
import { loadSchoolLevel, saveSchoolLevel } from './lib/library';
import { totalPoints, levelCounts, playerLevel, newPeak } from './lib/points';
import { colors, wrap, gutter, headerBand, tabBarHeight, btnLink } from './styles/theme';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import Tabs from './components/Tabs';
import MyCardsTab from './components/MyCardsTab';
import CardSetsTab from './components/CardSetsTab';
import StudySession from './components/StudySession';
import WordList from './components/WordList';

const TABS = [
  { id: 'myCards', label: 'My Cards' },
  { id: 'cardSets', label: 'Card Sets' },
];

function App() {
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Screens: 'dashboard', 'wordList' (Card Sets deck, before the drill) or 'study'
  const [view, setView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("myCards"); // always open on My Cards

  // Card Sets (global library)
  const [libraryData, setLibraryData] = useState([]); // textbooks, from shapeLibrary
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  // Which Card Sets screen is open, plus the chosen school level (see src/lib/library.js).
  // Kept here so that coming back from a deck's word list or drill returns to the same deck list.
  // The level starts from the one saved on the last visit.
  const [cardSetsPath, setCardSetsPath] = useState(() => ({ screen: "hub", level: loadSchoolLevel(window.localStorage) }));

  // Study session
  const [activeSet, setActiveSet] = useState(null);
  const [sessionKey, setSessionKey] = useState(0); // bumps to start a fresh StudySession
  const [loadingDeck, setLoadingDeck] = useState(false);

  // My Cards
  const [myDeckIds, setMyDeckIds] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [dueRows, setDueRows] = useState([]);
  const [savingDeck, setSavingDeck] = useState(false);
  const [removingDeckId, setRemovingDeckId] = useState(null);
  const [stats, setStats] = useState(null); // points and player level

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setMyDeckIds([]); setMyDecks([]); setStats(null); }
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

  async function loadDueRows() {
    try {
      setDueRows(await api.fetchDueRows());
    } catch (e) {
      console.error(e);
    }
  }

  async function loadStats(userId) {
    try {
      await api.waitForPendingSaves(); // include the last answers of a review that just ended
      const [levels, savedPeak] = await Promise.all([api.fetchAllCardLevels(), api.fetchPeakPoints()]);
      const currentPoints = totalPoints(levels);
      const peakPoints = newPeak(currentPoints, savedPeak);
      if (peakPoints > savedPeak) await api.savePeakPoints(userId, peakPoints);
      setStats({ currentPoints, peakPoints, playerLevel: playerLevel(peakPoints), levelCounts: levelCounts(levels) });
    } catch (e) {
      console.error(e);
    }
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

  return (
    <div style={{ background: colors.bg, minHeight: "100vh" }}>
      <div style={wrap}>
        <Header variant={bandHeader ? "band" : "compact"} user={session?.user} onSignOut={handleLogout} onHome={goHome} />

        <div style={{ position: "relative", padding: `0 ${gutter}px 60px`, marginTop: bandHeader ? -headerBand.overlap : 0 }}>
          {!session ? (
            <LoginScreen error={authError} onGoogleLogin={handleGoogleLogin} />
          ) : view === "dashboard" ? (
            <div style={{ paddingBottom: tabBarHeight + 32 }}>
              {activeTab === "myCards" && (
                <MyCardsTab
                  decks={myDecks}
                  dueRows={dueRows}
                  stats={stats}
                  onReview={startReview}
                  onRemove={removeDeck}
                  loading={loadingDeck}
                  removingDeckId={removingDeckId}
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
              <Tabs tabs={TABS} active={activeTab} onChange={changeTab} />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <button onClick={() => setView("dashboard")} style={btnLink}>
                  ← ダッシュボードに戻る (Back to Dashboard)
                </button>
              </div>
              {activeSet && view === "wordList" && (
                <WordList
                  activeSet={activeSet}
                  isAdded={myDeckIds.includes(activeSet.id)}
                  saving={savingDeck}
                  onAddDeck={addDeck}
                  onStart={() => beginSession(activeSet)}
                />
              )}
              {activeSet && view === "study" && (
                <StudySession
                  key={sessionKey}
                  activeSet={activeSet}
                  userId={session?.user.id}
                  isAdded={myDeckIds.includes(activeSet.id)}
                  saving={savingDeck}
                  onAddDeck={addDeck}
                  onBack={() => setView("dashboard")}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
