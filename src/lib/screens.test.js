// Tests for settings / stats stacking (戻る goes back one step at a time). Run with: npm test
import { describe, it, expect } from 'vitest';
import { openScreen, leaveScreen, reviewKept } from './screens';

const start = (view) => ({ view, settingsFrom: "dashboard", statsFrom: "dashboard" });
const strip = ({ reload, ...state }) => state; // eslint-disable-line no-unused-vars
// 戻る: the next state after leaving the open screen.
const back = (state, hasActiveSet = true) => ({ ...state, view: leaveScreen(state, hasActiveSet) });

describe('openScreen / leaveScreen', () => {
  it('settings from stats goes back to stats, and stats still goes back to where it was opened', () => {
    const stats = openScreen(start("mastered"), "stats");
    expect(stats).toMatchObject({ view: "stats", statsFrom: "mastered", reload: true });
    const settings = openScreen(strip(stats), "settings");
    expect(settings).toMatchObject({ view: "settings", settingsFrom: "stats", statsFrom: "mastered", reload: false });
    const backToStats = back(strip(settings));
    expect(backToStats.view).toBe("stats");
    expect(back(backToStats).view).toBe("mastered");
  });

  it('stats from settings goes back to settings, and settings still goes back to where it was opened', () => {
    const settings = strip(openScreen(start("dashboard"), "settings"));
    expect(settings).toMatchObject({ view: "settings", settingsFrom: "dashboard" });
    const stats = openScreen(settings, "stats");
    expect(stats).toMatchObject({ view: "stats", statsFrom: "settings", settingsFrom: "dashboard", reload: true });
    const backToSettings = back(strip(stats));
    expect(backToSettings.view).toBe("settings");
    expect(back(backToSettings).view).toBe("dashboard");
  });

  it('never loops: opening the screen underneath just goes back to it (stats keeps its data)', () => {
    const settingsOverStats = strip(openScreen(strip(openScreen(start("dashboard"), "stats")), "settings"));
    const again = openScreen(settingsOverStats, "stats");
    expect(again).toMatchObject({ view: "stats", statsFrom: "dashboard", reload: false });
    expect(back(strip(again)).view).toBe("dashboard");

    const statsOverSettings = strip(openScreen(strip(openScreen(start("gacha"), "settings")), "stats"));
    const settings = openScreen(statsOverSettings, "settings");
    expect(settings).toMatchObject({ view: "settings", settingsFrom: "gacha", reload: false });
  });

  it('opening the screen that is already open changes nothing', () => {
    const stats = strip(openScreen(start("dashboard"), "stats"));
    expect(openScreen(stats, "stats")).toEqual({ ...stats, reload: false });
  });
});

describe('a review behind both screens', () => {
  it('stays alive through study → stats → settings and comes back step by step', () => {
    const stats = strip(openScreen(start("study"), "stats"));
    expect(reviewKept(stats, true)).toBe(true);
    const settings = strip(openScreen(stats, "settings"));
    expect(reviewKept(settings, true)).toBe(true);
    const backToStats = back(settings);
    expect(backToStats.view).toBe("stats");
    expect(reviewKept(backToStats, true)).toBe(true);
    expect(back(backToStats).view).toBe("study");
  });

  it('stays alive through study → settings → stats', () => {
    const settings = strip(openScreen(start("study"), "settings"));
    const stats = strip(openScreen(settings, "stats"));
    expect(reviewKept(stats, true)).toBe(true);
    const backToSettings = back(stats);
    expect(reviewKept(backToSettings, true)).toBe(true);
    expect(back(backToSettings).view).toBe("study");
  });

  it('is not kept when there is no review, or the chain started elsewhere', () => {
    const settings = strip(openScreen(strip(openScreen(start("study"), "stats")), "settings"));
    expect(reviewKept(settings, false)).toBe(false);
    expect(back({ ...settings, view: "stats" }, false).view).toBe("dashboard");
    expect(reviewKept(strip(openScreen(start("dashboard"), "stats")), true)).toBe(false);
    expect(reviewKept(start("dashboard"), true)).toBe(false);
  });
});
