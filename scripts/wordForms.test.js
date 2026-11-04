// Tests for the plural and verb-form rules used to draft the dictionary's word details.
// Run with: npm test
import { describe, it, expect } from 'vitest';
import { pluralOf, verbForms } from './wordForms';

describe('pluralOf', () => {
  it.each([
    ['dog', 'dogs'], ['box', 'boxes'], ['bus', 'buses'], ['church', 'churches'], ['dish', 'dishes'],
    ['city', 'cities'], ['day', 'days'], ['boy', 'boys'], ['child', 'children'], ['woman', 'women'],
    ['policeman', 'policemen'], ['human', 'humans'], ['knife', 'knives'], ['leaf', 'leaves'], ['roof', 'roofs'],
    ['potato', 'potatoes'], ['piano', 'pianos'], ['photo', 'photos'], ['sheep', 'sheep'], ['crisis', 'crises'],
    ['post office', 'post offices'], ['cup of tea', 'cups of tea'], ['mother-in-law', 'mothers-in-law'],
    ['T-shirt', 'T-shirts'], ['tooth', 'teeth'], ['person', 'people'],
    ['bookshelf', 'bookshelves'], ['grandchild', 'grandchildren'], ['goldfish', 'goldfish'], ['housewife', 'housewives'],
    ['box', 'boxes'], ['superhero', 'superheroes'],
  ])('%s → %s', (noun, plural) => {
    expect(pluralOf(noun)).toBe(plural);
  });
});

describe('verbForms', () => {
  it.each([
    ['play', 'played', 'played', 'playing', 'plays'],
    ['study', 'studied', 'studied', 'studying', 'studies'],
    ['like', 'liked', 'liked', 'liking', 'likes'],
    ['stop', 'stopped', 'stopped', 'stopping', 'stops'],
    ['visit', 'visited', 'visited', 'visiting', 'visits'],
    ['travel', 'traveled', 'traveled', 'traveling', 'travels'],
    ['prefer', 'preferred', 'preferred', 'preferring', 'prefers'],
    ['open', 'opened', 'opened', 'opening', 'opens'],
    ['rain', 'rained', 'rained', 'raining', 'rains'],
    ['fix', 'fixed', 'fixed', 'fixing', 'fixes'],
    ['watch', 'watched', 'watched', 'watching', 'watches'],
    ['go', 'went', 'gone', 'going', 'goes'],
    ['have', 'had', 'had', 'having', 'has'],
    ['see', 'saw', 'seen', 'seeing', 'sees'],
    ['lie', 'lay', 'lain', 'lying', 'lies'],
    ['die', 'died', 'died', 'dying', 'dies'],
    ['run', 'ran', 'run', 'running', 'runs'],
    ['swim', 'swam', 'swum', 'swimming', 'swims'],
    ['write', 'wrote', 'written', 'writing', 'writes'],
    ['panic', 'panicked', 'panicked', 'panicking', 'panics'],
    ['agree', 'agreed', 'agreed', 'agreeing', 'agrees'],
    ['argue', 'argued', 'argued', 'arguing', 'argues'],
    ['rewrite', 'rewrote', 'rewritten', 'rewriting', 'rewrites'],
    ['give up', 'gave up', 'given up', 'giving up', 'gives up'],
    ['snow', 'snowed', 'snowed', 'snowing', 'snows'],
    ['enjoy', 'enjoyed', 'enjoyed', 'enjoying', 'enjoys'],
  ])('%s → %s, %s, %s, %s', (verb, past, pp, ing, third) => {
    expect(verbForms(verb)).toEqual({ past, pp, ing, third });
  });
});
