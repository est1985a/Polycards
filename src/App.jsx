import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const CLEAR_TARGET = 2; // only used for the Card Sets practice drill

// SRS settings (My Cards)
// Wait time (in hours) before a card is due again, by level it has just reached.
// Level 0 = new, level 7 = mastered (about 4 months).
const LEVEL_HOURS = [0, 4, 24, 72, 168, 336, 720, 2880];
const MAX_LEVEL = LEVEL_HOURS.length - 1;
const SESSION_SIZE = 20; // max cards per review session

// Wrong-answer penalty (WaniKani style):
// - every 2 misses on the same card in a session = 1 step down
// - from level 5 up, the penalty is doubled
// - a card you had already learned never drops below level 1
function levelAfterWrong(level, wrongCount) {
  if (level <= 0) return 0;
  const factor = level >= 5 ? 2 : 1;
  const drop = Math.ceil(wrongCount / 2) * factor;
  return Math.max(1, level - drop);
}

function buildCards(dbCards) {
  const cards = [];
  dbCards.forEach((c) => {
    cards.push({ id: `${c.id}-e2j`, direction: "en2jp", front: c.english, back: c.japanese, jp: c.japanese, en: c.english });
    cards.push({ id: `${c.id}-j2e`, direction: "jp2en", front: c.japanese, back: c.english, jp: c.japanese, en: c.english });
  });
  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reinsert(pile, cardId) {
  if (pile.length === 0) return [cardId];
  const minPos = Math.min(1, pile.length);
  const pos = minPos + Math.floor(Math.random() * (pile.length - minPos + 1));
  const next = [...pile];
  next.splice(pos, 0, cardId);
  return next;
}

const stampFill = (n) => Array.from({ length: CLEAR_TARGET }, (_, i) => i < n);

function Stamp({ filled }) {
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: "50%",
        border: `2px solid ${filled ? "#b23a2f" : "#d9d2bf"}`,
        background: filled ? "#b23a2f" : "transparent",
        display: "inline-block",
      }}
    />
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [bypassLogin, setBypassLogin] = useState(false);

  // View States: 'dashboard', 'play', 'done'
  const [view, setView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("cardSets"); // 'myCards' or 'cardSets'
  
  // Library Data State
  const [libraryData, setLibraryData] = useState({ JHS: [], HS: [], Other: [] });
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Play States
  const [activeSet, setActiveSet] = useState(null);
  const [pile, setPile] = useState([]);
  const [counts, setCounts] = useState({});
  const [clearedCount, setClearedCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState(false);

  // My Cards State
  const [myDeckIds, setMyDeckIds] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [dueRows, setDueRows] = useState([]);
  const [wrongCounts, setWrongCounts] = useState({});
  const [savingDeck, setSavingDeck] = useState(false);
  const [removingDeckId, setRemovingDeckId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setMyDeckIds([]); setMyDecks([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch the Global Library when the dashboard loads
  useEffect(() => {
    if ((session || bypassLogin) && view === "dashboard") {
      fetchLibrary();
    }
  }, [session, bypassLogin, view]);

  // Load the decks this student has added to My Cards
  useEffect(() => {
    if (session) fetchMyDeckIds();
  }, [session]);

  async function fetchMyDeckIds() {
    const { data, error } = await supabase
      .from('user_decks')
      .select('deck_id, added_at, decks ( id, name, units ( name, textbooks ( name ) ) )')
      .order('added_at', { ascending: true });
    if (!error && data) {
      setMyDeckIds(data.map((r) => r.deck_id));
      setMyDecks(data.filter((r) => r.decks).map((r) => r.decks));
    }
  }

  // 🚨 NEW DIAGNOSTIC VERSION 🚨
  async function fetchLibrary() {
    setLoadingLibrary(true);
    
    const { data, error } = await supabase
      .from('textbooks')
      .select(`
        id, name, school_level,
        units ( id, name, unit_order, decks ( id, name ) )
      `)
      .order('created_at', { ascending: true });

    if (error) {
      alert("Supabase Error: " + error.message);
    } else if (data && data.length === 0) {
      alert("Connected successfully, but 0 items returned. The table is either empty, or Row Level Security (RLS) is hiding the data.");
    }

    if (data && !error) {
      // Sort units by unit_order
      data.forEach(tb => {
        if (tb.units) tb.units.sort((a, b) => a.unit_order - b.unit_order);
      });

      // Group by school level
      const grouped = { JHS: [], HS: [], Other: [] };
      data.forEach(tb => {
        if (grouped[tb.school_level]) {
          grouped[tb.school_level].push(tb);
        } else {
          grouped.Other.push(tb);
        }
      });
      setLibraryData(grouped);
    }
    setLoadingLibrary(false);
  }

  // Refresh the "due now" counts whenever the dashboard is shown
  useEffect(() => {
    if (session && view === "dashboard") fetchDueRows();
  }, [session, view]);

  async function fetchDueRows() {
    const { data, error } = await supabase
      .from('user_cards')
      .select('card_id, cards ( deck_id )')
      .lte('next_review_at', new Date().toISOString());
    if (!error && data) setDueRows(data);
  }

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBypassLogin(false);
    setView("dashboard");
  };

  async function startDeck(deckDef) {
    setLoadingDeck(true);
    
    const { data: dbCards, error } = await supabase
      .from('cards')
      .select('id, english, japanese')
      .eq('deck_id', deckDef.id);

    if (error || !dbCards || dbCards.length === 0) {
      alert("No cards found in this deck yet!");
      setLoadingDeck(false);
      return;
    }

    const cards = buildCards(dbCards);
    setActiveSet({ id: deckDef.id, name: deckDef.name, cards });
    setCounts({});
    setClearedCount(0);
    setPile(shuffle(cards.map((c) => c.id)));
    setRevealed(false);
    setView("play");
    setLoadingDeck(false);
  }

  async function addDeckToMyCards() {
    if (!session) {
      alert("Sign in with Google to save decks to My Cards.");
      return;
    }
    if (!activeSet) return;
    setSavingDeck(true);

    const { data: dbCards, error: cardsError } = await supabase
      .from('cards')
      .select('id')
      .eq('deck_id', activeSet.id);

    if (cardsError || !dbCards || dbCards.length === 0) {
      alert("Could not load this deck's cards: " + (cardsError?.message || "no cards found"));
      setSavingDeck(false);
      return;
    }

    const userId = session.user.id;
    const rows = dbCards.flatMap((c) => [
      { user_id: userId, card_id: c.id, direction: 'en2jp' },
      { user_id: userId, card_id: c.id, direction: 'jp2en' },
    ]);

    const { error: progressError } = await supabase
      .from('user_cards')
      .upsert(rows, { onConflict: 'user_id,card_id,direction', ignoreDuplicates: true });

    if (progressError) {
      alert("Could not save card progress: " + progressError.message);
      setSavingDeck(false);
      return;
    }

    const { error: deckError } = await supabase
      .from('user_decks')
      .upsert({ user_id: userId, deck_id: activeSet.id }, { onConflict: 'user_id,deck_id', ignoreDuplicates: true });

    if (deckError) {
      alert("Could not save deck: " + deckError.message);
    } else {
      await fetchMyDeckIds();
    }
    setSavingDeck(false);
  }

  async function removeDeckFromMyCards(deck) {
    if (!session) return;
    if (!window.confirm(`「${deck.name}」をマイカードから削除しますか？\nRemove "${deck.name}" from My Cards? Your review progress for this deck will be lost.`)) return;
    setRemovingDeckId(deck.id);

    const { data: dbCards, error: cardsError } = await supabase
      .from('cards')
      .select('id')
      .eq('deck_id', deck.id);

    if (cardsError) {
      alert("Could not load this deck's cards: " + cardsError.message);
      setRemovingDeckId(null);
      return;
    }

    const userId = session.user.id;
    if (dbCards && dbCards.length > 0) {
      const { error: progressError } = await supabase
        .from('user_cards')
        .delete()
        .eq('user_id', userId)
        .in('card_id', dbCards.map((c) => c.id));

      if (progressError) {
        alert("Could not remove card progress: " + progressError.message);
        setRemovingDeckId(null);
        return;
      }
    }

    // .select() returns the deleted rows, so an RLS policy that silently blocks the delete shows up as 0 rows
    const { data: removed, error: deckError } = await supabase
      .from('user_decks')
      .delete()
      .eq('user_id', userId)
      .eq('deck_id', deck.id)
      .select();

    if (deckError) {
      alert("Could not remove deck: " + deckError.message);
    } else if (!removed || removed.length === 0) {
      alert("Deck was not removed. Check that a DELETE policy exists on user_decks.");
    }
    await Promise.all([fetchMyDeckIds(), fetchDueRows()]);
    setRemovingDeckId(null);
  }

  async function startReview(deckId = null, deckName = null) {
    if (!session) return;
    setLoadingDeck(true);

    let query = supabase
      .from('user_cards')
      .select('card_id, direction, level, cards!inner ( id, english, japanese, deck_id )')
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true })
      .limit(SESSION_SIZE);
    if (deckId) query = query.eq('cards.deck_id', deckId);

    const { data, error } = await query;

    if (error) {
      alert("Could not load reviews: " + error.message);
      setLoadingDeck(false);
      return;
    }
    if (!data || data.length === 0) {
      alert("今は復習するカードがありません。(Nothing is due right now.)");
      setLoadingDeck(false);
      return;
    }

    const cards = data.map((r) => {
      const c = r.cards;
      const e2j = r.direction === 'en2jp';
      return {
        id: `${r.card_id}-${e2j ? 'e2j' : 'j2e'}`,
        cardId: r.card_id,
        direction: r.direction,
        front: e2j ? c.english : c.japanese,
        back: e2j ? c.japanese : c.english,
        jp: c.japanese,
        en: c.english,
        level: r.level,
      };
    });

    setActiveSet({ id: deckId || 'review', name: deckName || '復習 (Review)', cards, mode: 'srs' });
    setCounts({});
    setWrongCounts({});
    setClearedCount(0);
    setPile(shuffle(cards.map((c) => c.id)));
    setRevealed(false);
    setView("play");
    setLoadingDeck(false);
  }

  async function saveProgress(card, newLevel) {
    const nextReview = new Date(Date.now() + LEVEL_HOURS[newLevel] * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from('user_cards')
      .update({ level: newLevel, next_review_at: nextReview, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('card_id', card.cardId)
      .eq('direction', card.direction);
    if (error) alert("Could not save progress: " + error.message);
  }

  function handleSrsAnswer(card, knew) {
    let nextPile = pile.slice(1);
    let clearedDelta = 0;

    if (knew) {
      // Only a clean answer (no misses on this card yet this session) moves it UP.
      // If it was missed earlier, its lowered level was already saved at that miss.
      if (!wrongCounts[card.id]) {
        saveProgress(card, Math.min(card.level + 1, MAX_LEVEL));
      }
      clearedDelta = 1;
    } else {
      // Each miss lowers the saved level further (see levelAfterWrong).
      // card.level is the level the card had when the session started.
      const wrongs = (wrongCounts[card.id] || 0) + 1;
      setWrongCounts({ ...wrongCounts, [card.id]: wrongs });
      saveProgress(card, levelAfterWrong(card.level, wrongs));
      nextPile = reinsert(nextPile, card.id);
    }

    setPile(nextPile);
    setClearedCount((c) => c + clearedDelta);
    setRevealed(false);
    if (nextPile.length === 0) setView("done");
  }

  function currentCard() {
    if (!activeSet || pile.length === 0) return null;
    return activeSet.cards.find((c) => c.id === pile[0]) || null;
  }

  function handleAnswer(knew) {
    const card = currentCard();
    if (!card) return;

    if (activeSet.mode === 'srs') {
      handleSrsAnswer(card, knew);
      return;
    }

    const nextCounts = { ...counts };
    let nextPile = pile.slice(1);
    let clearedDelta = 0;

    if (knew) {
      const n = (counts[card.id] || 0) + 1;
      nextCounts[card.id] = n;
      if (n >= CLEAR_TARGET) {
        clearedDelta = 1;
      } else {
        nextPile = reinsert(nextPile, card.id);
      }
    } else {
      nextCounts[card.id] = 0;
      nextPile = reinsert(nextPile, card.id);
    }

    setCounts(nextCounts);
    setPile(nextPile);
    setClearedCount((c) => c + clearedDelta);
    setRevealed(false);

    if (nextPile.length === 0) setView("done");
  }

  const wrap = {
    maxWidth: 480, margin: "0 auto", padding: "24px 20px 60px", minHeight: 500,
    fontFamily: "'Hiragino Maru Gothic ProN', 'Yu Gothic', 'Segoe UI', system-ui, sans-serif", color: "#2c2a24",
  };
  const serif = "Georgia, 'Hiragino Mincho ProN', 'Yu Mincho', serif";
  const cardStyle = { background: "#fffdf7", border: "1px solid #e4dcc4", borderRadius: 10 };
  const btnPrimary = { background: "#22406b", color: "#fbf7ec", border: "none", borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
  const btnGhost = { background: "transparent", color: "#22406b", border: "1px solid #22406b", borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
  const tabActive = { padding: "10px 16px", borderBottom: "3px solid #b23a2f", fontWeight: "bold", cursor: "pointer", color: "#22406b" };
  const tabInactive = { padding: "10px 16px", borderBottom: "3px solid transparent", cursor: "pointer", color: "#8a8468" };

  const isLoggedIn = session || bypassLogin;

  const deckAdded = activeSet ? myDeckIds.includes(activeSet.id) : false;
  const dueByDeck = {};
  dueRows.forEach((r) => {
    const d = r.cards?.deck_id;
    if (d) dueByDeck[d] = (dueByDeck[d] || 0) + 1;
  });
  const addDeckControl = activeSet?.mode === 'srs' ? null : deckAdded ? (
    <div style={{ textAlign: "center", fontSize: 13, color: "#22406b" }}>✓ マイカードに追加済み (Added to My Cards)</div>
  ) : (
    <button onClick={addDeckToMyCards} disabled={savingDeck} style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>
      {savingDeck ? "追加中..." : "＋ マイカードに追加 (Add to My Cards)"}
    </button>
  );

  return (
    <div style={{ background: "#f4efe1", minHeight: "100vh" }}>
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontFamily: serif, fontSize: 24, margin: 0, color: "#22406b" }}>
            Polycards
          </h1>
          {isLoggedIn && (
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: "#7a7462", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              Sign Out
            </button>
          )}
        </div>

        {!isLoggedIn ? (
          <div style={{ ...cardStyle, padding: 30, textAlign: "center", marginTop: 40, display: "grid", gap: 16 }}>
            <h2 style={{ fontSize: 18, color: "#22406b", margin: 0 }}>Sign in to start studying</h2>
            {authError && <p style={{ color: '#b23a2f', fontSize: 13, margin: 0 }}>{authError}</p>}
            <button onClick={handleGoogleLogin} style={{ ...btnGhost, width: "100%" }}>Sign In with Google</button>
            <div style={{ borderTop: "1px solid #e4dcc4", margin: "8px 0" }}></div>
            <button onClick={() => setBypassLogin(true)} style={{ background: "none", border: "none", color: "#22406b", fontSize: 13, cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>
              Skip login for now (Test App)
            </button>
          </div>
        ) : (
          <>
            {view !== "dashboard" && (
              <div style={{ marginBottom: 14 }}>
                <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: "#7a7462", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                  ← ダッシュボードに戻る (Back to Dashboard)
                </button>
              </div>
            )}

            {view === "dashboard" && (
              <div>
                <div style={{ display: "flex", borderBottom: "1px solid #e4dcc4", marginBottom: 20 }}>
                  <div style={activeTab === "myCards" ? tabActive : tabInactive} onClick={() => setActiveTab("myCards")}>
                    My Cards
                  </div>
                  <div style={activeTab === "cardSets" ? tabActive : tabInactive} onClick={() => setActiveTab("cardSets")}>
                    Card Sets
                  </div>
                </div>

                {activeTab === "myCards" && (
                  myDecks.length === 0 ? (
                    <div style={{ ...cardStyle, padding: 30, textAlign: "center" }}>
                      <h3 style={{ margin: "0 0 10px", color: "#22406b" }}>Your Personal Rotation</h3>
                      <p style={{ fontSize: 14, color: "#5c5744" }}>
                        You haven't saved any sets yet! Go to the <strong>Card Sets</strong> tab to find vocabulary lists and add them to your SRS schedule.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ ...cardStyle, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: "#8a8468" }}>今の復習 (Due now)</div>
                          <div style={{ fontFamily: serif, fontSize: 28, color: "#22406b" }}>{dueRows.length}</div>
                        </div>
                        <button
                          onClick={() => startReview()}
                          disabled={loadingDeck || dueRows.length === 0}
                          style={{ ...btnPrimary, opacity: dueRows.length === 0 ? 0.4 : 1 }}
                        >
                          復習スタート<br />Start Review
                        </button>
                      </div>

                      {myDecks.map((deck) => {
                        const due = dueByDeck[deck.id] || 0;
                        return (
                          <div key={deck.id} style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 12, color: "#8a8468" }}>
                                {deck.units?.textbooks?.name} ・ {deck.units?.name}
                              </div>
                              <div style={{ fontSize: 16, fontWeight: "bold", color: "#22406b" }}>{deck.name}</div>
                              <div style={{ fontSize: 12, color: due > 0 ? "#b23a2f" : "#8a8468" }}>
                                {due > 0 ? `${due} 枚 復習できます` : "今は復習なし"}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                              <button
                                onClick={() => startReview(deck.id, deck.name)}
                                disabled={loadingDeck || due === 0}
                                style={{ ...btnGhost, fontSize: 13, padding: "8px 12px", opacity: due === 0 ? 0.4 : 1 }}
                              >
                                復習<br />Review
                              </button>
                              <button
                                onClick={() => removeDeckFromMyCards(deck)}
                                disabled={removingDeckId === deck.id}
                                style={{ background: "none", border: "none", color: "#b23a2f", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                              >
                                {removingDeckId === deck.id ? "削除中..." : "削除 (Remove)"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {activeTab === "cardSets" && (
                  <div>
                    {loadingLibrary ? (
                      <p style={{ textAlign: "center", color: "#8a8468" }}>Loading library from database...</p>
                    ) : (
                      <div style={{ display: "grid", gap: 24 }}>
                        {libraryData.HS.length > 0 && (
                          <div>
                            <h2 style={{ fontSize: 18, color: "#22406b", borderBottom: "2px solid #d9d2bf", paddingBottom: 6 }}>High School</h2>
                            {libraryData.HS.map(tb => (
                              <div key={tb.id} style={{ marginTop: 12 }}>
                                <h3 style={{ fontSize: 15, margin: "0 0 8px", color: "#2c2a24" }}>📖 {tb.name}</h3>
                                {tb.units?.map(unit => (
                                  <div key={unit.id} style={{ marginLeft: 16, marginBottom: 12 }}>
                                    <div style={{ fontSize: 14, fontWeight: "bold", color: "#5c5744", marginBottom: 6 }}>{unit.name}</div>
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                      {unit.decks?.map(deck => (
                                        <button 
                                          key={deck.id} 
                                          onClick={() => startDeck(deck)}
                                          disabled={loadingDeck}
                                          style={{ ...btnPrimary, background: "#3a6096", fontSize: 13, padding: "8px 12px" }}
                                        >
                                          {deck.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {libraryData.JHS.length > 0 && (
                          <div>
                            <h2 style={{ fontSize: 18, color: "#22406b", borderBottom: "2px solid #d9d2bf", paddingBottom: 6 }}>Junior High School</h2>
                            {libraryData.JHS.map(tb => (
                               <div key={tb.id} style={{ marginTop: 12 }}>
                                <h3 style={{ fontSize: 15, margin: "0 0 8px", color: "#2c2a24" }}>📖 {tb.name}</h3>
                                {tb.units?.map(unit => (
                                  <div key={unit.id} style={{ marginLeft: 16, marginBottom: 12 }}>
                                    <div style={{ fontSize: 14, fontWeight: "bold", color: "#5c5744", marginBottom: 6 }}>{unit.name}</div>
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                      {unit.decks?.map(deck => (
                                        <button key={deck.id} onClick={() => startDeck(deck)} style={{ ...btnPrimary, background: "#3a6096", fontSize: 13, padding: "8px 12px" }}>
                                          {deck.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(view === "play" || view === "done") && activeSet && (
              <div style={{ display: "grid", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5c5744" }}>
                  <span>{activeSet.name}</span>
                  <span>覚えた: {clearedCount} ・ 残り: {pile.length}</span>
                </div>

                {addDeckControl}

                {view === "play" && currentCard() && (
                  <>
                    <p style={{ fontSize: 14, color: "#5c5744", margin: 0, textAlign: "center" }}>
                      {currentCard().direction === "en2jp" ? "この単語は日本語で何と言いますか？" : "この単語は英語で何と言いますか？"}
                    </p>
                    <div onClick={() => setRevealed(true)} style={{ ...cardStyle, minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: revealed ? "default" : "pointer", padding: 24 }}>
                      <div style={{ fontSize: 12, color: "#8a8468" }}>{currentCard().direction === "en2jp" ? "English to Japanese" : "Japanese to English"}</div>
                      <div style={{ fontFamily: serif, fontSize: 30, textAlign: "center" }}>{currentCard().front}</div>
                      {revealed && <div style={{ fontSize: 22, color: "#22406b", borderTop: "1px solid #e4dcc4", paddingTop: 12, width: "100%", textAlign: "center" }}>{currentCard().back}</div>}
                    </div>
                    {activeSet.mode === 'srs' ? (
                      <div style={{ textAlign: "center", fontSize: 13, color: "#8a8468" }}>
                        Lv. {currentCard().level}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {stampFill(counts[currentCard().id] || 0).map((f, i) => <Stamp key={i} filled={f} />)}
                      </div>
                    )}
                    {revealed && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button style={{ ...btnGhost, flex: 1 }} onClick={() => handleAnswer(false)}>Still learning<br />まだ</button>
                        <button style={{ ...btnPrimary, flex: 1 }} onClick={() => handleAnswer(true)}>I knew it<br />わかった</button>
                      </div>
                    )}
                  </>
                )}

                {view === "done" && (
                  <div style={{ ...cardStyle, padding: 28, textAlign: "center", display: "grid", gap: 10 }}>
                    <div style={{ fontFamily: serif, fontSize: 22, color: "#22406b" }}>全部クリアしました！</div>
                    {addDeckControl}
                    <button style={btnGhost} onClick={() => setView("dashboard")}>ダッシュボードに戻る</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;