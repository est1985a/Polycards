import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { colors, fontDisplay, fontBody } from '../styles/theme';
import { searchDictionary, isImeKey } from '../lib/dictionary';
import { t } from '../i18n';

const DEBOUNCE_MS = 150;

// Magnifier icon (drawn, theme colors via currentColor).
export function SearchIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 L20.5 20.5" />
    </svg>
  );
}

// The suggestion list under the box. Without state, so tests can render it.
export function Suggestions({ id, results, active, loading, failed, query, onPick, onHover }) {
  if (!query) return null;
  const row = { padding: "10px 14px", minHeight: 44, boxSizing: "border-box", fontSize: 14 };
  let body;
  if (failed) body = <div style={{ ...row, color: colors.danger }}>{t("dictionary.loadFailed")}</div>;
  else if (loading) body = <div style={{ ...row, color: colors.muted }}>{t("common.loading")}</div>;
  else if (results.length === 0) body = <div style={{ ...row, color: colors.muted }}>{t("dictionary.noResults")}</div>;
  return (
    <div
      style={{
        position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 1, maxHeight: "min(60vh, 420px)", overflowY: "auto",
        background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 16,
        boxShadow: `0 10px 30px color-mix(in srgb, ${colors.bg} 70%, transparent)`, textAlign: "left",
      }}
    >
      {body}
      {!body && (
        <ul id={id} role="listbox" aria-label={t("dictionary.label")} style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
          {results.map((w, i) => (
            <li
              key={w.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              // pointerdown + preventDefault: the box keeps focus (no keyboard flicker on the iPad).
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onPick(w)}
              onPointerEnter={() => onHover(i)}
              style={{
                ...row, display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer",
                background: i === active ? colors.surface2 : "transparent",
              }}
            >
              <span lang="en" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 16, color: colors.text, flexShrink: 0, maxWidth: "50%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {w.english}
              </span>
              {w.pos && (
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, border: `1px solid ${colors.line}`, background: colors.surface2, borderRadius: 999, padding: "0 7px", flexShrink: 0 }}>
                  {t(`pos.label.${w.pos}`)}
                </span>
              )}
              <span style={{ color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{w.japanese}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The dictionary search in the header. Wide screens: a search box. Phones: a magnifier button that
// opens a box under the header (×, Escape or a tap outside closes it).
// index: the search index (buildDictionaryIndex, null until loaded); onNeedWords(): load it (called on focus);
// failed: loading failed. onPick(word): a suggestion was chosen (App opens the word pop-up).
// disabled: a review question is showing, so the search is off (it could give the answer away).
export default function DictionarySearch({ wide = false, index = null, failed = false, onNeedWords, onPick, disabled = false }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false); // phones: the drop-down box
  const [focused, setFocused] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const justComposed = useRef(false);
  const listId = useId();

  const results = useMemo(() => (index ? searchDictionary(index, debounced) : []), [index, debounced]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(query); setActive(0); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Switched off (a review question appeared): close and forget what was typed (adjusted while
  // rendering, so nothing typed is ever searched while the question shows).
  if (disabled && (query || debounced || panelOpen)) {
    setQuery("");
    setDebounced("");
    setPanelOpen(false);
  }
  useEffect(() => {
    if (disabled) inputRef.current?.blur();
  }, [disabled]);

  // A tap outside closes the suggestions (and the phone box).
  const showing = (wide || panelOpen) && focused;
  useEffect(() => {
    if (!showing && !panelOpen) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setFocused(false);
        setPanelOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showing, panelOpen]);

  // Phones: focus the box when it opens.
  useEffect(() => {
    if (panelOpen) inputRef.current?.focus({ preventScroll: true });
  }, [panelOpen]);

  function close() {
    setQuery("");
    setDebounced("");
    setPanelOpen(false);
    setFocused(false);
    inputRef.current?.blur();
  }

  function pick(word) {
    close();
    onPick?.(word);
  }

  function onKeyDown(e) {
    e.stopPropagation(); // never reaches anything behind (e.g. a review)
    if (isImeKey(e, justComposed.current)) return;
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Only a list that matches what is typed (not one still waiting for the debounce).
      if (results.length && debounced === query) pick(results[Math.min(active, results.length - 1)]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else close();
    }
  }

  const visibleQuery = debounced.trim() && query.trim() ? debounced.trim() : "";
  const listShown = focused && Boolean(visibleQuery);
  const box = (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: 12, display: "flex", color: colors.muted, pointerEvents: "none" }}>
          <SearchIcon size={18} />
        </span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={t("dictionary.label")}
          aria-expanded={listShown && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={listShown && results.length ? `${listId}-${active}` : undefined}
          title={disabled ? t("dictionary.locked") : undefined}
          placeholder={disabled ? t("dictionary.locked") : t("dictionary.placeholder")}
          disabled={disabled}
          value={query}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); onNeedWords?.(); }}
          onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget)) setFocused(false); }}
          onKeyDown={onKeyDown}
          onCompositionStart={() => { justComposed.current = false; }}
          onCompositionEnd={() => { justComposed.current = true; setTimeout(() => { justComposed.current = false; }, 0); }}
          className="dictionary-input"
          style={{
            width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 12px 0 38px", borderRadius: 999,
            fontFamily: fontBody, fontSize: 16, color: colors.text, background: colors.surface2,
            border: `2px solid ${colors.line}`, opacity: disabled ? 0.55 : 1, outline: "none",
          }}
        />
      </div>
      {listShown && (
        <Suggestions
          id={listId} results={results} active={active} query={visibleQuery}
          loading={!index && !failed} failed={failed} onPick={pick} onHover={setActive}
        />
      )}
      <span role="status" style={srOnly}>
        {listShown && index ? t("dictionary.results", { n: results.length, count: results.length }) : ""}
      </span>
    </div>
  );

  if (wide) {
    return <div ref={rootRef} style={{ width: "100%", maxWidth: 380 }}>{box}</div>;
  }

  return (
    <div ref={rootRef}>
      <button
        type="button"
        aria-label={disabled ? t("dictionary.locked") : t("dictionary.open")}
        aria-expanded={panelOpen}
        aria-disabled={disabled || undefined}
        title={disabled ? t("dictionary.locked") : undefined}
        onClick={() => { if (!disabled) setPanelOpen((o) => !o); }}
        style={{
          width: 44, height: 44, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
          background: colors.surface2, border: `2px solid ${panelOpen ? colors.accent : colors.line}`, color: colors.text,
          cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, padding: 0,
        }}
      >
        <SearchIcon />
      </button>
      {panelOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, padding: "0 var(--dictionary-gutter, 16px)" }}>
          {box}
        </div>
      )}
    </div>
  );
}

// Read by screen readers only.
const srOnly = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };
