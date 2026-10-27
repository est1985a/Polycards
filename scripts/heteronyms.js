// Heteronyms: words spelled the same but said differently depending on the meaning (read 読む / read 読んだ).
// TTS can only guess which one a card means, so a card that needs the less common pronunciation gets
// words.speak_as (e.g. "red" for the past tense of read). The recording script lists heteronyms without
// speak_as so their clips get a listen, and tools/deck-import-tool.html warns about them at import time.
//
// KEEP IN SYNC with the HETERONYMS list in tools/deck-import-tool.html (a test checks they match).
// Each note: the two pronunciations, then a speak_as that has worked, when there is one. Stress-only pairs
// (REcord / reCORD) usually can't be fixed by respelling, so for those the note just says to listen.
export const HETERONYMS = {
  read: 'reed (present) / red (past): past tense → speak_as "red"',
  lead: 'leed (to guide) / led (the metal): metal → speak_as "led"',
  live: 'liv (to live) / lyve (live music): adjective → speak_as "lyve"',
  wind: 'wind (moving air) / wynd (wind a clock): verb → try speak_as "wined"',
  tear: 'teer (from your eye) / tair (to rip): rip → try speak_as "tare"',
  wound: 'woond (an injury) / wownd (past of wind): listen',
  bow: 'bow like "cow" (to bend) / boh (ribbon, arrow): ribbon → try speak_as "beau"',
  row: 'roh (a line) / row like "cow" (an argument): listen',
  close: 'kloze (to shut) / klohss (near): listen',
  use: 'yooz (to use) / yooss (a use): listen',
  does: 'duz (he does) / dohz (female deer): listen',
  dove: 'duv (the bird) / dohv (past of dive): listen',
  bass: 'base (music) / bass (the fish): music → try speak_as "base"',
  sow: 'soh (to plant) / sow like "cow" (a pig): listen',
  minute: 'MIN-it (60 seconds) / my-NOOT (tiny): listen',
  excuse: 'ex-KYOOSS (an excuse) / ex-KYOOZ (to excuse): listen',
  house: 'howss (a house) / howz (to house): listen',
  desert: 'DEZ-ert (sandy place) / de-ZERT (to leave): listen (stress)',
  present: 'PREZ-ent (a gift, now) / pre-ZENT (to present): listen (stress)',
  record: 'REK-ord (a record) / re-KORD (to record): listen (stress)',
  object: 'OB-ject (a thing) / ob-JECT (to object): listen (stress)',
  project: 'PROJ-ect (a project) / pro-JECT (to project): listen (stress)',
  produce: 'PROH-duce (vegetables) / pro-DUCE (to make): listen (stress)',
  permit: 'PER-mit (a permit) / per-MIT (to allow): listen (stress)',
  content: 'KON-tent (contents) / kon-TENT (happy): listen (stress)',
  contract: 'KON-tract (an agreement) / kon-TRACT (to shrink): listen (stress)',
  conduct: 'KON-duct (behavior) / kon-DUCT (to lead): listen (stress)',
  increase: 'IN-crease (a rise) / in-CREASE (to rise): listen (stress)',
  decrease: 'DE-crease (a fall) / de-CREASE (to fall): listen (stress)',
  refuse: 'REF-yooss (trash) / re-FYOOZ (to say no): listen',
  export: 'EX-port (an export) / ex-PORT (to export): listen (stress)',
  import: 'IM-port (an import) / im-PORT (to import): listen (stress)',
  subject: 'SUB-ject (a school subject) / sub-JECT (to subject): listen (stress)',
  perfect: 'PER-fect (perfect) / per-FECT (to perfect): listen (stress)',
  rebel: 'REB-el (a rebel) / re-BEL (to rebel): listen (stress)',
  conflict: 'KON-flict (a conflict) / kon-FLICT (to conflict): listen (stress)',
  separate: 'SEP-rit (separate) / SEP-a-rate (to separate): listen',
  estimate: 'ES-ti-mit (an estimate) / ES-ti-mate (to estimate): listen',
  graduate: 'GRAD-joo-it (a graduate) / GRAD-joo-ate (to graduate): listen',
};

const key = (english) => String(english ?? '').trim().toLowerCase();

export function isHeteronym(english) {
  return Object.hasOwn(HETERONYMS, key(english));
}

export function heteronymNote(english) {
  return isHeteronym(english) ? HETERONYMS[key(english)] : '';
}

// Heteronyms with no speak_as, sorted by English then Japanese: the clips that need a listen.
export function heteronymsToCheck(words) {
  return words
    .filter((w) => isHeteronym(w.english) && !String(w.speak_as ?? '').trim())
    .sort((a, b) => key(a.english).localeCompare(key(b.english)) || String(a.japanese ?? '').localeCompare(String(b.japanese ?? '')));
}
