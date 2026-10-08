import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import * as api from './lib/api';
import { buildCards, buildReviewCards } from './lib/drill';
import { totalPoints, levelCounts, playerLevel, newPeak } from './lib/points';
import { colors, wrap, gutter, tabBarHeight, btnLink } from './styles/theme';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import Tabs from './components/Tabs';
import MyCardsTab from './components/MyCardsTab';
import CardSetsTab from './components/CardSetsTab';
import StudySession from './components/StudySession';

const TABS = [
  { id: 'myCards', label: 'My Cards' },
  { id: 'cardSets', label: 'Card Sets' },
];

function App() {
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Screens: 'dashboard' or 'study'
  const [view, setView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("cardSets");

  // Card Sets (global library)
  const [libraryData, setLibraryData] = useState({ JHS: [], HS: [], Other: [] });
  const [loadingLibrary, setLoadingLibrary] = useState(false);

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
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView("dashboard");
  };

  function beginSession(set) {
    setActiveSet(set);
    setSessionKey((k) => k + 1);
    setView("study");
  }

  // Card Sets: open a deck as a "try it" drill
  async function startDeck(deck) {
    setLoadingDeck(true);
    try {
      const words = await api.fetchDeckWords(deck.id);
      if (words.length === 0) throw new Error();
      beginSession({ id: deck.id, name: deck.name, cards: buildCards(words) });
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

  return (
    <div style={{ background: colors.bg, minHeight: "100vh" }}>
      <div style={{ ...wrap, padding: `24px ${gutter}px 60px` }}>
        <Header showSignOut={!!session} onSignOut={handleLogout} />

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
              <CardSetsTab library={libraryData} loading={loadingLibrary} onOpenDeck={startDeck} disabled={loadingDeck} />
            )}
            <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setView("dashboard")} style={btnLink}>
                ← ダッシュボードに戻る (Back to Dashboard)
              </button>
            </div>
            {activeSet && (
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
  );
}

export default App;
