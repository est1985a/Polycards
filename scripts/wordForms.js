// English word forms for the dictionary's word details (dictionary phase 3): plurals and verb forms.
// Used by scripts/wordDetails.mjs to draft each batch; every row is then checked by hand and any
// fix goes in scripts/word-details/fixes.json. Pure functions, tested in wordForms.test.js.

// Plurals that don't follow the rules.
export const IRREGULAR_PLURALS = {
  child: 'children', man: 'men', woman: 'women', person: 'people', foot: 'feet', tooth: 'teeth',
  mouse: 'mice', goose: 'geese', ox: 'oxen', sheep: 'sheep', fish: 'fish', deer: 'deer',
  series: 'series', species: 'species', aircraft: 'aircraft', salmon: 'salmon', means: 'means',
  life: 'lives', wife: 'wives', knife: 'knives', leaf: 'leaves', half: 'halves', wolf: 'wolves',
  shelf: 'shelves', thief: 'thieves', loaf: 'loaves', calf: 'calves', self: 'selves', elf: 'elves',
  potato: 'potatoes', tomato: 'tomatoes', hero: 'heroes', echo: 'echoes', volcano: 'volcanoes',
  mosquito: 'mosquitoes', torpedo: 'torpedoes', veto: 'vetoes',
  crisis: 'crises', analysis: 'analyses', basis: 'bases', thesis: 'theses', hypothesis: 'hypotheses',
  diagnosis: 'diagnoses', oasis: 'oases', axis: 'axes',
  phenomenon: 'phenomena', criterion: 'criteria', medium: 'media', datum: 'data', bacterium: 'bacteria',
  cactus: 'cacti', fungus: 'fungi', nucleus: 'nuclei', stimulus: 'stimuli', syllabus: 'syllabuses',
  index: 'indexes', appendix: 'appendixes', matrix: 'matrices', vertex: 'vertices',
  passerby: 'passersby', 'passer-by': 'passers-by',
};

const ES_ENDING = /(s|x|z|ch|sh)$/;

// The plural of one word (lower-case rules, the word's own capitals kept).
function pluralWord(word) {
  const lower = word.toLowerCase();
  if (IRREGULAR_PLURALS[lower]) return matchCase(word, IRREGULAR_PLURALS[lower]);
  // A longer word ending in an irregular one (4+ letters): bookshelf → bookshelves, grandchild → grandchildren.
  const end = Object.keys(IRREGULAR_PLURALS).find((key) => key.length >= 4 && lower.endsWith(key));
  if (end) return word.slice(0, -end.length) + IRREGULAR_PLURALS[end];
  if (/(man|woman)$/.test(lower) && !/(human|german|roman|shaman)$/.test(lower)) return word.replace(/man$/i, 'men');
  if (/[^aeiou]y$/.test(lower)) return word.slice(0, -1) + 'ies';
  if (ES_ENDING.test(lower)) return word + 'es';
  return word + 's';
}

function matchCase(original, form) {
  return /^[A-Z]/.test(original) ? form[0].toUpperCase() + form.slice(1) : form;
}

// The plural of a noun: one word, or a phrase whose last word changes (post office → post offices),
// except "X of Y" and "X-in-law", where the first part changes (cup of tea → cups of tea).
export function pluralOf(noun) {
  const text = (noun || '').trim();
  if (!text) return null;
  const of = text.match(/^(\S+)( (of|in|on|to) .+)$/);
  if (of) return pluralWord(of[1]) + of[2];
  const inLaw = text.match(/^([a-z]+)(-in-law)$/i);
  if (inLaw) return pluralWord(inLaw[1]) + inLaw[2];
  const parts = text.split(' ');
  parts[parts.length - 1] = pluralWord(parts[parts.length - 1]);
  return parts.join(' ');
}

// Irregular verbs: base → [past, past participle].
export const IRREGULAR_VERBS = {
  be: ['was / were', 'been'], have: ['had', 'had'], do: ['did', 'done'], go: ['went', 'gone'],
  arise: ['arose', 'arisen'], awake: ['awoke', 'awoken'], bear: ['bore', 'born'], beat: ['beat', 'beaten'],
  become: ['became', 'become'], begin: ['began', 'begun'], bend: ['bent', 'bent'], bet: ['bet', 'bet'],
  bind: ['bound', 'bound'], bite: ['bit', 'bitten'], bleed: ['bled', 'bled'], blow: ['blew', 'blown'],
  break: ['broke', 'broken'], breed: ['bred', 'bred'], bring: ['brought', 'brought'],
  broadcast: ['broadcast', 'broadcast'], build: ['built', 'built'], burn: ['burned', 'burned'],
  burst: ['burst', 'burst'], buy: ['bought', 'bought'], cast: ['cast', 'cast'], catch: ['caught', 'caught'],
  choose: ['chose', 'chosen'], cling: ['clung', 'clung'], come: ['came', 'come'], cost: ['cost', 'cost'],
  creep: ['crept', 'crept'], cut: ['cut', 'cut'], deal: ['dealt', 'dealt'], dig: ['dug', 'dug'],
  draw: ['drew', 'drawn'], dream: ['dreamed', 'dreamed'], drink: ['drank', 'drunk'], drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], feed: ['fed', 'fed'], feel: ['felt', 'felt'],
  fight: ['fought', 'fought'], find: ['found', 'found'], flee: ['fled', 'fled'], fly: ['flew', 'flown'],
  forbid: ['forbade', 'forbidden'], forecast: ['forecast', 'forecast'], forget: ['forgot', 'forgotten'],
  forgive: ['forgave', 'forgiven'], freeze: ['froze', 'frozen'], get: ['got', 'gotten'], give: ['gave', 'given'],
  grind: ['ground', 'ground'], grow: ['grew', 'grown'], hang: ['hung', 'hung'], hear: ['heard', 'heard'],
  hide: ['hid', 'hidden'], hit: ['hit', 'hit'], hold: ['held', 'held'], hurt: ['hurt', 'hurt'],
  keep: ['kept', 'kept'], kneel: ['knelt', 'knelt'], know: ['knew', 'known'], lay: ['laid', 'laid'],
  lead: ['led', 'led'], lean: ['leaned', 'leaned'], leap: ['leaped', 'leaped'], learn: ['learned', 'learned'],
  leave: ['left', 'left'], lend: ['lent', 'lent'], let: ['let', 'let'], lie: ['lay', 'lain'],
  light: ['lit', 'lit'], lose: ['lost', 'lost'], make: ['made', 'made'], mean: ['meant', 'meant'],
  meet: ['met', 'met'], mislead: ['misled', 'misled'], mistake: ['mistook', 'mistaken'],
  misunderstand: ['misunderstood', 'misunderstood'], overcome: ['overcame', 'overcome'],
  overhear: ['overheard', 'overheard'], oversleep: ['overslept', 'overslept'], overtake: ['overtook', 'overtaken'],
  pay: ['paid', 'paid'], prove: ['proved', 'proven'], put: ['put', 'put'], quit: ['quit', 'quit'],
  read: ['read', 'read'], rebuild: ['rebuilt', 'rebuilt'], ride: ['rode', 'ridden'], ring: ['rang', 'rung'],
  rise: ['rose', 'risen'], run: ['ran', 'run'], say: ['said', 'said'], see: ['saw', 'seen'],
  seek: ['sought', 'sought'], sell: ['sold', 'sold'], send: ['sent', 'sent'], set: ['set', 'set'],
  sew: ['sewed', 'sewn'], shake: ['shook', 'shaken'], shed: ['shed', 'shed'], shine: ['shone', 'shone'],
  shoot: ['shot', 'shot'], show: ['showed', 'shown'], shrink: ['shrank', 'shrunk'], shut: ['shut', 'shut'],
  sing: ['sang', 'sung'], sink: ['sank', 'sunk'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'],
  slide: ['slid', 'slid'], sow: ['sowed', 'sown'], speak: ['spoke', 'spoken'], speed: ['sped', 'sped'],
  spend: ['spent', 'spent'], spin: ['spun', 'spun'], spit: ['spat', 'spat'], split: ['split', 'split'],
  spread: ['spread', 'spread'], spring: ['sprang', 'sprung'], stand: ['stood', 'stood'], steal: ['stole', 'stolen'],
  stick: ['stuck', 'stuck'], sting: ['stung', 'stung'], stink: ['stank', 'stunk'], strike: ['struck', 'struck'],
  string: ['strung', 'strung'], strive: ['strove', 'striven'], swear: ['swore', 'sworn'], sweep: ['swept', 'swept'],
  swell: ['swelled', 'swollen'], swim: ['swam', 'swum'], swing: ['swung', 'swung'], take: ['took', 'taken'],
  teach: ['taught', 'taught'], tear: ['tore', 'torn'], tell: ['told', 'told'], think: ['thought', 'thought'],
  throw: ['threw', 'thrown'], undergo: ['underwent', 'undergone'], understand: ['understood', 'understood'],
  undertake: ['undertook', 'undertaken'], upset: ['upset', 'upset'], wake: ['woke', 'woken'],
  wear: ['wore', 'worn'], weave: ['wove', 'woven'], weep: ['wept', 'wept'], win: ['won', 'won'],
  wind: ['wound', 'wound'], withdraw: ['withdrew', 'withdrawn'], wring: ['wrung', 'wrung'], write: ['wrote', 'written'],
  // Verbs whose regular past doubles a final consonant or adds a k.
  panic: ['panicked', 'panicked'], picnic: ['picnicked', 'picnicked'], mimic: ['mimicked', 'mimicked'],
};

// Two-syllable verbs stressed on the second syllable double their last consonant (American English);
// one-syllable verbs ending consonant-vowel-consonant do too (stop → stopped). Anything else that should
// double, or a one-syllable verb that shouldn't, goes in scripts/word-details/fixes.json.
const DOUBLE_STRESSED = new Set([
  'admit', 'begin', 'commit', 'compel', 'concur', 'confer', 'control', 'deter', 'equip', 'excel', 'expel',
  'forget', 'forbid', 'incur', 'occur', 'omit', 'patrol', 'permit', 'prefer', 'propel', 'rebel', 'recur',
  'refer', 'regret', 'repel', 'submit', 'transfer', 'transmit', 'upset', 'acquit', 'abet', 'abhor',
]);
const NEVER_DOUBLE = /[wxy]$/;

function doubles(verb) {
  if (DOUBLE_STRESSED.has(verb)) return true;
  if (NEVER_DOUBLE.test(verb)) return false;
  // One syllable, ending consonant + single vowel + consonant: stop, plan, chat (not rain, help, cook).
  const vowelGroups = verb.match(/[aeiou]+/g) || [];
  if (vowelGroups.length !== 1) return false;
  return /[^aeiou][aeiou][^aeiou]$/.test(verb);
}

// -ing form: make → making, stop → stopping, lie → lying, see → seeing.
function ingForm(verb) {
  if (/ie$/.test(verb)) return verb.slice(0, -2) + 'ying';
  if (/(ee|ye|oe)$/.test(verb) || verb === 'be') return verb + 'ing';
  if (/[^aeiou]e$/.test(verb) || /ue$/.test(verb)) return verb.slice(0, -1) + 'ing';
  if (/c$/.test(verb) && IRREGULAR_VERBS[verb]) return verb + 'king';
  if (doubles(verb)) return verb + verb.slice(-1) + 'ing';
  return verb + 'ing';
}

// Regular -ed: like → liked, study → studied, stop → stopped, play → played.
function edForm(verb) {
  if (/e$/.test(verb)) return verb + 'd';
  if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + 'ied';
  if (doubles(verb)) return verb + verb.slice(-1) + 'ed';
  return verb + 'ed';
}

// 3rd person -s: go → goes, study → studies, watch → watches, have → has.
function thirdForm(verb) {
  if (verb === 'have') return 'has';
  if (verb === 'be') return 'is';
  if (verb === 'do' || verb === 'go') return verb + 'es';
  if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + 'ies';
  if (ES_ENDING.test(verb)) return verb + 'es';
  return verb + 's';
}

// All four forms of a verb: { past, pp, ing, third }. A phrasal verb changes its first word
// (give up → gave up, given up, giving up, gives up). A prefix verb (re-, un-, mis-, over-, under-,
// with-, for-) uses its root's irregular forms (rewrite → rewrote, rewritten).
export function verbForms(verb) {
  const text = (verb || '').trim().toLowerCase();
  if (!text) return null;
  const [head, ...rest] = text.split(' ');
  const tail = rest.length ? ' ' + rest.join(' ') : '';
  let pair = IRREGULAR_VERBS[head];
  if (!pair) {
    const prefix = head.match(/^(re|un|mis|over|under|out|with|for|fore)(.+)$/);
    const root = prefix && IRREGULAR_VERBS[prefix[2]];
    if (root && prefix[2].length >= 3) pair = root.map((f) => f.split(' / ').map((x) => prefix[1] + x).join(' / '));
  }
  const past = pair ? pair[0] : edForm(head);
  const pp = pair ? pair[1] : edForm(head);
  return { past: past + tail, pp: pp + tail, ing: ingForm(head) + tail, third: thirdForm(head) + tail };
}
