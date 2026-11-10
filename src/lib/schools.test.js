// Tests for schools and teacher sign-up (pure helpers). Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  PREFECTURES, SCHOOL_TYPES, emailDomain, inDomains, domainsLabel, cleanDomainInput, domainValid, parseDomainList,
  schoolNameValid, cleanSchoolName, schoolKanaValid, teacherNameValid, cleanTeacherName,
  schoolMenuState, pendingSchoolName, splitAdminSchools,
} from './schools';
import ja from '../i18n/ja';
import en from '../i18n/en';

const sql = readFileSync(new URL('../../supabase/polyvo-schools-phase1.sql', import.meta.url), 'utf8');

// The keys inside "create or replace function public.<name>() ... array[ ... ]".
function sqlArray(fn) {
  const body = sql.slice(sql.indexOf(`function public.${fn}()`));
  const list = body.slice(body.indexOf('array['), body.indexOf(']::text[]'));
  return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

describe('lists shared with the SQL', () => {
  it('the 47 prefectures + overseas / other, the same as school_prefecture_keys()', () => {
    expect(PREFECTURES).toHaveLength(48);
    expect(new Set(PREFECTURES).size).toBe(48);
    expect(sqlArray('school_prefecture_keys')).toEqual(PREFECTURES);
  });

  it('school types, the same as school_type_keys()', () => {
    expect(sqlArray('school_type_keys')).toEqual(SCHOOL_TYPES);
  });

  it('every prefecture and type has a label in both languages', () => {
    for (const p of PREFECTURES) {
      expect(ja[`schools.pref.${p}`], p).toBeTruthy();
      expect(en[`schools.pref.${p}`], p).toBeTruthy();
    }
    for (const k of SCHOOL_TYPES) {
      expect(ja[`schools.type.${k}`], k).toBeTruthy();
      expect(en[`schools.type.${k}`], k).toBeTruthy();
    }
  });

  it('the free-mail list lives only in the SQL', () => {
    expect(sql).toContain("'gmail.com'");
    expect(readFileSync(new URL('./schools.js', import.meta.url), 'utf8')).not.toContain('gmail');
  });
});

describe('domains', () => {
  it('emailDomain: the part after the last @, lower case', () => {
    expect(emailDomain(' Taro@RyukokuRG.ed.jp ')).toBe('ryukokurg.ed.jp');
    expect(emailDomain('a@b@c.jp')).toBe('c.jp');
    expect(emailDomain('ｔａｒｏ＠ｓｃｈｏｏｌ．ｊｐ')).toBe('school.jp');
    expect(emailDomain('no-at-sign')).toBe(null);
    expect(emailDomain('trailing@')).toBe(null);
  });

  it('inDomains: exact match only, never "ends with"', () => {
    const d = ['ryukokurg.ed.jp'];
    expect(inDomains('taro@ryukokurg.ed.jp', d)).toBe(true);
    expect(inDomains('taro@sub.ryukokurg.ed.jp', d)).toBe(false);
    expect(inDomains('taro@xryukokurg.ed.jp', d)).toBe(false);
    expect(inDomains('taro@ryukokurg.ed.jp.evil.com', d)).toBe(false);
    expect(inDomains('taro@ryukokurg.ed.jp', [])).toBe(false);
    expect(inDomains('taro@ryukokurg.ed.jp', null)).toBe(false);
  });

  it('domainsLabel', () => {
    expect(domainsLabel(['a.ed.jp', 'b.ed.jp'])).toBe('@a.ed.jp / @b.ed.jp');
    expect(domainsLabel([])).toBe('');
  });

  it('cleanDomainInput / domainValid (like clean_domain() in the SQL)', () => {
    expect(cleanDomainInput(' @RyukokuRG.ed.jp. ')).toBe('ryukokurg.ed.jp');
    expect(cleanDomainInput('teacher@School.ED.jp')).toBe('school.ed.jp');
    expect(domainValid('ryukokurg.ed.jp')).toBe(true);
    expect(domainValid('my-school.jp')).toBe(true);
    expect(domainValid('not a domain')).toBe(false);
    expect(domainValid('localhost')).toBe(false);
    expect(domainValid('-bad.jp')).toBe(false);
    expect(domainValid('school.j')).toBe(false);
  });

  it('parseDomainList: commas, spaces, line breaks, Japanese commas; no repeats', () => {
    expect(parseDomainList('a.ed.jp, @B.ed.jp\nb.ed.jp、c.jp')).toEqual(['a.ed.jp', 'b.ed.jp', 'c.jp']);
    expect(parseDomainList('   ')).toEqual([]);
  });
});

describe('names', () => {
  it('school name: 2–60 after NFKC and space clean-up', () => {
    expect(cleanSchoolName('  ＡＢＣ　中学校 ')).toBe('ABC 中学校');
    expect(schoolNameValid('龍谷')).toBe(true);
    expect(schoolNameValid('龍')).toBe(false);
    expect(schoolNameValid('あ'.repeat(61))).toBe(false);
  });

  it('ふりがな: optional, hiragana / katakana / ー / ・ / spaces only', () => {
    expect(schoolKanaValid('')).toBe(true);
    expect(schoolKanaValid('りゅうこく ちゅうがっこう')).toBe(true);
    expect(schoolKanaValid('リュウコク・コーコー')).toBe(true);
    expect(schoolKanaValid('ﾘｭｳｺｸ')).toBe(true); // half-width becomes full-width
    expect(schoolKanaValid('龍谷')).toBe(false);
    expect(schoolKanaValid('ryukoku')).toBe(false);
  });

  it('teacher display name: 1–20', () => {
    expect(cleanTeacherName('  アンドレ　先生 ')).toBe('アンドレ 先生');
    expect(teacherNameValid('アンドレ先生')).toBe(true);
    expect(teacherNameValid('   ')).toBe(false);
    expect(teacherNameValid('あ'.repeat(21))).toBe(false);
  });
});

describe('account menu state', () => {
  const school = { id: 's1', name: '龍谷中学校・高等学校' };
  it('picks what to offer', () => {
    expect(schoolMenuState(null)).toBe('hidden');
    expect(schoolMenuState({ google: false, is_teacher: false, membership: null })).toBe('hidden');
    expect(schoolMenuState({ google: true, is_teacher: false, membership: null })).toBe('register');
    expect(schoolMenuState({ google: true, is_teacher: false, membership: { status: 'pending', school } })).toBe('pending');
    expect(schoolMenuState({ google: true, is_teacher: true, membership: { status: 'approved', school } })).toBe('teacher');
    // a username test account that is a teacher (migrated) is still a teacher
    expect(schoolMenuState({ google: false, is_teacher: true, membership: { status: 'approved', school } })).toBe('teacher');
  });

  it('pendingSchoolName', () => {
    expect(pendingSchoolName({ google: true, is_teacher: false, membership: { status: 'pending', school } })).toBe('龍谷中学校・高等学校');
    expect(pendingSchoolName({ google: true, is_teacher: true, membership: { status: 'approved', school } })).toBe(null);
    expect(pendingSchoolName(null)).toBe(null);
  });
});

describe('admin screen', () => {
  it('splits waiting schools from the rest', () => {
    const { pending, others } = splitAdminSchools([
      { id: 1, status: 'approved' }, { id: 2, status: 'pending' }, { id: 3, status: 'declined' },
    ]);
    expect(pending.map((s) => s.id)).toEqual([2]);
    expect(others.map((s) => s.id)).toEqual([1, 3]);
    expect(splitAdminSchools(null)).toEqual({ pending: [], others: [] });
  });
});
