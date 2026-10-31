// Tests for the settings saved on the account (and their copy on the device). Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  SETTING_DEFAULTS, mergeSettings, settingsPayload, sameSettings, loadDeviceSettings, saveDeviceSettings, clearDeviceSettings,
} from './accountSettings';

const memory = () => {
  const data = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
};
const blocked = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};

const device = { sessionSize: 10, answerMode: 'typing', reduceMotion: true, autoPlay: false, slowSpeech: true, lang: 'en' };

describe('mergeSettings (the account wins over the device)', () => {
  it('takes every valid value from the account', () => {
    const account = { sessionSize: 30, answerMode: 'handwriting', reduceMotion: false, autoPlay: true, slowSpeech: false, lang: 'ja' };
    expect(mergeSettings(device, account)).toEqual(account);
  });

  it('keeps the device value for anything missing or broken on the account', () => {
    const account = { sessionSize: 15, answerMode: 'pencil', reduceMotion: 'yes', lang: 'fr', autoPlay: true };
    expect(mergeSettings(device, account)).toEqual({ ...device, autoPlay: true });
  });

  it('ignores an account value that is not an object, and drops unknown keys', () => {
    for (const bad of [null, undefined, 'x', 3, [1, 2]]) expect(mergeSettings(device, bad)).toEqual(device);
    expect(mergeSettings(device, { theme: 'galaxy', isTeacher: true })).toEqual(device);
  });

  it('turns 手書き into typing when handwriting is switched off', () => {
    expect(mergeSettings(device, { answerMode: 'handwriting' }, false).answerMode).toBe('typing');
    expect(mergeSettings({ ...device, answerMode: 'handwriting' }, {}, false).answerMode).toBe('typing');
  });
});

describe('payload and comparing', () => {
  it('sends only the known keys', () => {
    expect(settingsPayload({ ...device, extra: 1 })).toEqual(device);
    expect(Object.keys(settingsPayload(device))).toEqual(Object.keys(SETTING_DEFAULTS));
  });

  it('compares only the known keys', () => {
    expect(sameSettings(device, { ...device, extra: 1 })).toBe(true);
    expect(sameSettings(device, { ...device, lang: 'ja' })).toBe(false);
  });
});

describe('the copy on the device', () => {
  it('is the defaults when nothing is saved or storage is blocked', () => {
    expect(loadDeviceSettings(memory())).toEqual(SETTING_DEFAULTS);
    expect(loadDeviceSettings(blocked)).toEqual(SETTING_DEFAULTS);
    expect(() => saveDeviceSettings(blocked, device)).not.toThrow();
    expect(() => clearDeviceSettings(blocked)).not.toThrow();
  });

  it('saves and loads every setting under the existing keys', () => {
    const storage = memory();
    saveDeviceSettings(storage, device);
    expect(loadDeviceSettings(storage)).toEqual(device);
    expect(storage.data).toMatchObject({
      'polycards.sessionSize': '10', 'polycards.answerMode': 'typing', 'polycards.reduceMotion': 'true',
      'polycards.autoPlay': 'false', 'polycards.slowSpeech': 'true', 'polycards.lang': 'en',
    });
  });

  it('log-out puts the defaults back (also the old typing switch)', () => {
    const storage = memory();
    saveDeviceSettings(storage, device);
    storage.setItem('polycards.typingMode', '1');
    clearDeviceSettings(storage);
    expect(loadDeviceSettings(storage)).toEqual(SETTING_DEFAULTS);
    expect(storage.data['polycards.typingMode']).toBeUndefined();
  });
});
