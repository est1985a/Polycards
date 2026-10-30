import { useEffect, useRef } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { levelLadder } from '../lib/schedule';
import { shouldCloseSheet } from '../lib/sheet';
import { showTrainingTab } from '../lib/training';
import { HANDWRITING_ENABLED } from '../handwriting/config';
import { ABOUT } from '../content/aboutPolycards';
import { TEACHER_GUIDE } from '../content/teacherGuide';
import { DEFAULT_SESSION_SIZE } from '../lib/srs';
import { t } from '../i18n';

const chip = {
  display: "inline-flex", alignItems: "baseline", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700,
};

// Lv1 4時間 … Lv7 4か月 (from LEVEL_HOURS), then Mastered!
function Ladder() {
  return (
    <ol aria-label={t("about.ladderLabel")} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {levelLadder().map(({ level, label }) => (
        <li key={level} className="about-ladder-chip" style={{ ...chip, background: colors.surface2, border: `1px solid ${colors.line}`, color: colors.text }}>
          <span style={{ fontFamily: fontDisplay, color: colors.muted }}>{t("about.ladderLevel", { n: level })}</span>
          <span>{label}</span>
        </li>
      ))}
      <li className="about-ladder-mastered" style={{ ...chip, fontFamily: fontDisplay, background: colors.accent, border: `1px solid ${colors.accent}`, color: colors.accentInk }}>
        {t("about.ladderMastered")}
      </li>
    </ol>
  );
}

// Features a section or line can depend on (`when` in the layout files), so the guide never
// describes something this build hides.
const FEATURES = {
  training: () => showTrainingTab(),
  handwriting: () => HANDWRITING_ENABLED,
};
const shown = (entry) => !entry?.when || !!FEATURES[entry.when]?.();

// ①, ②, … (Unicode circled digits).
const circled = (n) => String.fromCharCode(0x2460 + n - 1);

const paragraph = { margin: 0, fontSize: 15, lineHeight: 1.7, color: colors.text };
const listStyle = { margin: 0, paddingLeft: 22, display: "grid", gap: 6 };

function Icon({ icon }) {
  return icon ? <span aria-hidden="true" style={{ marginRight: 6 }}>{icon}</span> : null;
}

function Section({ number, section, sessionSize, level = 3 }) {
  // Entries are i18n keys, or { key, when } for a line that depends on a feature.
  const fill = (entries) => (entries ?? []).filter(shown).map((e) => t(typeof e === "string" ? e : e.key, { sessionSize }));
  const paragraphsBefore = fill(section.paragraphsBefore);
  const paragraphsAfter = fill(section.paragraphsAfter);
  const paragraphs = fill(section.paragraphs);
  const list = fill(section.list);
  const steps = fill(section.steps);
  const paragraphsEnd = fill(section.paragraphsEnd);
  const hasLadder = paragraphsBefore.length > 0 || paragraphsAfter.length > 0;
  const Heading = level === 3 ? "h3" : "h4";
  return (
    <section style={{ display: "grid", gap: 10 }}>
      {section.heading && (
        <Heading style={{ margin: 0, fontFamily: fontDisplay, fontSize: level === 3 ? 18 : 16, color: colors.text }}>
          <Icon icon={section.icon} />
          {number != null && <span style={{ color: colors.gold }}>{circled(number)} </span>}
          {t(section.heading)}
        </Heading>
      )}
      {paragraphsBefore.map((p) => <p key={p} style={paragraph}>{p}</p>)}
      {hasLadder && <Ladder />}
      {paragraphsAfter.map((p) => <p key={p} style={paragraph}>{p}</p>)}
      {paragraphs.map((p) => <p key={p} style={paragraph}>{p}</p>)}
      {steps.length > 0 && (
        <ol style={listStyle}>
          {steps.map((item) => <li key={item} style={paragraph}>{item}</li>)}
        </ol>
      )}
      {list.length > 0 && (
        <ul style={listStyle}>
          {list.map((item) => <li key={item} style={paragraph}>{item}</li>)}
        </ul>
      )}
      {paragraphsEnd.map((p) => <p key={p} style={paragraph}>{p}</p>)}
    </section>
  );
}

// The tips box at the end of the student part and of the teacher guide.
function Tips({ tips, sessionSize }) {
  return (
    <div className="about-tips" style={{ background: colors.surface2, border: `2px solid ${colors.gold}`, borderRadius: 16, padding: "14px 16px" }}>
      <Section section={tips} sessionSize={sessionSize} />
    </div>
  );
}

// Numbered sections (only the ones shown), then the tips box.
function Sections({ guide, sessionSize }) {
  return (
    <>
      {guide.sections.filter(shown).map((s, i) => <Section key={s.heading} number={i + 1} section={s} sessionSize={sessionSize} />)}
      <Tips tips={guide.tips} sessionSize={sessionSize} />
    </>
  );
}

// もっと詳しく / Learn more: closed by default.
function More({ sessionSize }) {
  return (
    <details className="about-more" style={{ borderTop: `2px solid ${colors.line}`, paddingTop: 6 }}>
      <summary style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: fontDisplay, fontSize: 17, fontWeight: 700, color: colors.text }}>
        <svg className="about-more-chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
        {t(ABOUT.more.summary)}
      </summary>
      <div style={{ display: "grid", gap: 18, paddingTop: 8 }}>
        {ABOUT.more.sections.map((s) => <Section key={s.heading} section={s} sessionSize={sessionSize} level={4} />)}
      </div>
    </details>
  );
}

// "What is Polycards?" pop-up: how the app works, for students, plus the 先生用ガイド for teachers.
// Layout in src/content/aboutPolycards.js and teacherGuide.js, wording in src/i18n/ja.js (about.*, teacherGuide.*).
// Same layout as the review plan pop-up (classes in src/index.css), a little wider on big screens.
// Focus moves to × when it opens and goes back to the button that opened it when it closes.
// sessionSize: the student's 1回の枚数, shown in the text. isTeacher: show the teacher guide.
// focus 'teacher': open scrolled to the teacher guide (from the 先生 tab).
export default function AboutSheet({ onClose, sessionSize = DEFAULT_SESSION_SIZE, isTeacher = false, focus = null }) {
  const closeRef = useRef(null);
  const teacherRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (shouldCloseSheet(e)) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (focus === "teacher") teacherRef.current?.scrollIntoView?.({ block: "start" });
  }, [focus]);

  return (
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (shouldCloseSheet(e)) onClose(); }}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <div
        className="review-plan-sheet about-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "left", paddingTop: 0 }}
      >
        <div style={{ position: "sticky", top: 0, zIndex: 1, background: colors.surface, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "12px 0 10px" }}>
          <div>
            <h2 id="about-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700 }}>{t(ABOUT.title)}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: colors.muted }}>{t(ABOUT.subtitle)}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t("common.close")}
            style={{ width: 44, height: 44, flexShrink: 0, marginRight: -10, background: "transparent", border: "none", color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        <div style={{ display: "grid", gap: 22 }}>
          <p style={{ ...paragraph, fontSize: 16, fontWeight: 700 }}>
            <Icon icon={ABOUT.intro.icon} />
            {ABOUT.intro.paragraphs.map((key) => t(key)).join("")}
          </p>
          <Sections guide={ABOUT} sessionSize={sessionSize} />
          <More sessionSize={sessionSize} />
          {isTeacher && (
            <section
              id="teacher-guide"
              ref={teacherRef}
              aria-labelledby="teacher-guide-title"
              style={{ display: "grid", gap: 22, borderTop: `2px solid ${colors.line}`, paddingTop: 18, scrollMarginTop: 72 }}
            >
              <div>
                <h2 id="teacher-guide-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: colors.text }}>
                  {t(TEACHER_GUIDE.title)}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: colors.muted }}>{t(TEACHER_GUIDE.subtitle)}</p>
              </div>
              <Sections guide={TEACHER_GUIDE} sessionSize={sessionSize} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
