// Every Supabase query the app makes lives here.
// Each function throws an Error if something goes wrong, so screens can show the message.
import { supabase } from './supabaseClient';
import { SESSION_SIZE, nextReviewDate } from './srs';

// Global library: textbooks → units → decks, grouped by school level.
export async function fetchLibrary() {
  const { data, error } = await supabase
    .from('textbooks')
    .select(`
      id, name, school_level,
      units ( id, name, unit_order, decks ( id, name ) )
    `)
    .order('created_at', { ascending: true });
  if (error) throw new Error("Supabase Error: " + error.message);

  const grouped = { JHS: [], HS: [], Other: [] };
  (data || []).forEach((tb) => {
    if (tb.units) tb.units.sort((a, b) => a.unit_order - b.unit_order);
    (grouped[tb.school_level] || grouped.Other).push(tb);
  });
  return grouped;
}

// Decks this student added to My Cards, oldest first.
export async function fetchMyDecks() {
  const { data, error } = await supabase
    .from('user_decks')
    .select('deck_id, added_at, decks ( id, name, units ( name, textbooks ( name ) ) )')
    .order('added_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// Cards that are due now (used for the due counts).
export async function fetchDueRows() {
  const { data, error } = await supabase
    .from('user_cards')
    .select('card_id, cards ( deck_id )')
    .lte('next_review_at', new Date().toISOString());
  if (error) throw new Error(error.message);
  return data || [];
}

// Word pairs in one deck.
export async function fetchDeckCards(deckId) {
  const { data, error } = await supabase
    .from('cards')
    .select('id, english, japanese')
    .eq('deck_id', deckId);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addDeckToMyCards(userId, deckId) {
  const { data: dbCards, error: cardsError } = await supabase
    .from('cards')
    .select('id')
    .eq('deck_id', deckId);
  if (cardsError || !dbCards || dbCards.length === 0) {
    throw new Error("Could not load this deck's cards: " + (cardsError?.message || "no cards found"));
  }

  const rows = dbCards.flatMap((c) => [
    { user_id: userId, card_id: c.id, direction: 'en2jp' },
    { user_id: userId, card_id: c.id, direction: 'jp2en' },
  ]);
  const { error: progressError } = await supabase
    .from('user_cards')
    .upsert(rows, { onConflict: 'user_id,card_id,direction', ignoreDuplicates: true });
  if (progressError) throw new Error("Could not save card progress: " + progressError.message);

  const { error: deckError } = await supabase
    .from('user_decks')
    .upsert({ user_id: userId, deck_id: deckId }, { onConflict: 'user_id,deck_id', ignoreDuplicates: true });
  if (deckError) throw new Error("Could not save deck: " + deckError.message);
}

export async function removeDeckFromMyCards(userId, deckId) {
  const { data: dbCards, error: cardsError } = await supabase
    .from('cards')
    .select('id')
    .eq('deck_id', deckId);
  if (cardsError) throw new Error("Could not load this deck's cards: " + cardsError.message);

  if (dbCards && dbCards.length > 0) {
    const { error: progressError } = await supabase
      .from('user_cards')
      .delete()
      .eq('user_id', userId)
      .in('card_id', dbCards.map((c) => c.id));
    if (progressError) throw new Error("Could not remove card progress: " + progressError.message);
  }

  // .select() returns the deleted rows, so an RLS policy that silently blocks the delete shows up as 0 rows
  const { data: removed, error: deckError } = await supabase
    .from('user_decks')
    .delete()
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .select();
  if (deckError) throw new Error("Could not remove deck: " + deckError.message);
  if (!removed || removed.length === 0) {
    throw new Error("Deck was not removed. Check that a DELETE policy exists on user_decks.");
  }
}

// Due cards for a review session (all decks, or one deck), oldest due first.
export async function fetchReviewRows(deckId = null) {
  let query = supabase
    .from('user_cards')
    .select('card_id, direction, level, cards!inner ( id, english, japanese, deck_id )')
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(SESSION_SIZE);
  if (deckId) query = query.eq('cards.deck_id', deckId);

  const { data, error } = await query;
  if (error) throw new Error("Could not load reviews: " + error.message);
  return data || [];
}

export async function saveProgress(userId, card, newLevel) {
  const { error } = await supabase
    .from('user_cards')
    .update({
      level: newLevel,
      next_review_at: nextReviewDate(newLevel).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('card_id', card.cardId)
    .eq('direction', card.direction);
  if (error) throw new Error("Could not save progress: " + error.message);
}
