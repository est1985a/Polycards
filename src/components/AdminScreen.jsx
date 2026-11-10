import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAction } from '../lib/useAction';
import { colors, fontDisplay } from '../styles/theme';
import { splitAdminSchools, parseDomainList, domainValid, domainsLabel, schoolLine } from '../lib/schools';
import { dateText } from '../lib/classes';
import { StickyBackButton } from './BackButton';
import { Panel, Field, ErrorText } from './ClassFields';
import { ConfirmLine } from './ClassPage';
import ToggleSwitch from './ToggleSwitch';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

const cardStyle = { display: "grid", gap: 10, padding: "12px 14px", borderRadius: 12, background: colors.surface2 };

function StatusPill({ status }) {
  const c = status === "approved" ? colors.accentText : status === "pending" ? colors.gold : colors.muted;
  return (
    <span data-admin-status={status} style={{ display: "inline-block", padding: "1px 8px", borderRadius: 999, border: `1.5px solid ${c}`, color: c, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {t(`admin.status.${status}`)}
    </span>
  );
}

// A domain text field; returns [domains, badOnes] for the current text.
function readDomains(text) {
  const list = parseDomainList(text);
  return [list, list.filter((d) => !domainValid(d))];
}

function DomainField({ value, onChange }) {
  return (
    <Field label={t("admin.domainsLabel")} hint={t("admin.domainsHint")}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="school.ed.jp" {...noAutoFix} style={inputStyle} />
    </Field>
  );
}

// A school waiting for approval: who registered it, a domain field, 承認する / 却下する (asks first).
export function PendingSchoolCard({ school, onApprove, onDecline, initialMode = null }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState(initialMode); // null | 'decline'
  const action = useAction();
  const [domains, bad] = readDomains(text);
  const creator = school.creator;
  return (
    <li data-pending-school={school.id} style={cardStyle}>
      <div style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{school.name}</span>
        {school.name_kana && <span style={{ fontSize: 13, color: colors.muted }}>{school.name_kana}</span>}
        <span style={{ fontSize: 13, color: colors.muted }}>{schoolLine(school)}</span>
        {creator && (
          <span style={{ fontSize: 13, color: colors.text, overflowWrap: "anywhere" }}>
            {t("admin.registeredBy", { name: [creator.display_name, creator.account_name, creator.email].filter(Boolean).join(" · ") })}
          </span>
        )}
        <span style={{ fontSize: 12, color: colors.muted }}>{t("admin.registeredOn", { date: dateText(school.created_at) })}</span>
      </div>
      <DomainField value={text} onChange={setText} />
      {bad.length > 0 && <ErrorText>{t("admin.badDomains", { list: bad.join(", ") })}</ErrorText>}
      {mode === "decline" ? (
        <ConfirmLine
          text={t("admin.declineConfirm", { name: school.name })}
          yesLabel={t("admin.decline")}
          danger
          busy={action.busy}
          onYes={() => action.run(() => onDecline(school.id))}
          onCancel={() => { setMode(null); action.clearError(); }}
        />
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={() => setMode("decline")} disabled={action.busy} style={ghostSmall}>{t("admin.decline")}</button>
          <button
            type="button"
            onClick={() => action.run(() => onApprove(school.id, domains))}
            disabled={action.busy || bad.length > 0}
            style={{ ...primarySmall, opacity: action.busy || bad.length > 0 ? 0.6 : 1 }}
          >
            {action.busy ? "…" : t("admin.approve")}
          </button>
        </div>
      )}
      <ErrorText>{action.error}</ErrorText>
    </li>
  );
}

// Any school: status, place, domains, counts; ドメインを編集 and domain auto-approve (approved schools).
export function AdminSchoolRow({ school, onSetDomains, onAutoApprove, initialEditing = false }) {
  const [editing, setEditing] = useState(initialEditing);
  const [text, setText] = useState((school.domains || []).join(", "));
  const action = useAction();
  const [domains, bad] = readDomains(text);
  const approved = school.status === "approved";
  return (
    <li data-admin-school={school.id} style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ flex: "1 1 200px", minWidth: 0, fontSize: 16, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{school.name}</span>
        <StatusPill status={school.status} />
      </div>
      <div style={{ display: "grid", gap: 2, fontSize: 13, color: colors.muted }}>
        <span>{schoolLine(school)}</span>
        <span>{(school.domains || []).length > 0 ? t("school.domains", { domains: domainsLabel(school.domains) }) : t("school.noDomains")}</span>
        <span>{t("admin.counts", { teachers: school.teacher_count, classes: school.class_count, requests: school.pending_requests })}</span>
        {approved && school.admin_count === 0 && <span style={{ color: colors.gold, fontWeight: 700 }}>{t("admin.noAdmin")}</span>}
      </div>
      {approved && (school.domains || []).length > 0 && (
        <button
          type="button"
          role="switch"
          aria-checked={!!school.auto_approve_domain}
          disabled={action.busy}
          onClick={() => action.run(() => onAutoApprove(school.id, !school.auto_approve_domain))}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, padding: "0 4px",
            background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: colors.text, textAlign: "left",
          }}
        >
          <span>{t("school.autoApprove")}</span>
          <ToggleSwitch on={!!school.auto_approve_domain} />
        </button>
      )}
      {approved && (editing ? (
        <div style={{ display: "grid", gap: 8 }}>
          <DomainField value={text} onChange={setText} />
          {bad.length > 0 && <ErrorText>{t("admin.badDomains", { list: bad.join(", ") })}</ErrorText>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => { setEditing(false); setText((school.domains || []).join(", ")); action.clearError(); }} disabled={action.busy} style={ghostSmall}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={action.busy || bad.length > 0}
              onClick={async () => { if (await action.run(() => onSetDomains(school.id, domains))) setEditing(false); }}
              style={{ ...primarySmall, opacity: action.busy || bad.length > 0 ? 0.6 : 1 }}
            >
              {action.busy ? "…" : t("admin.save")}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setEditing(true)} style={ghostSmall}>{t("admin.editDomains")}</button>
        </div>
      ))}
      <ErrorText>{action.error}</ErrorText>
    </li>
  );
}

// Plain markup (tests render it): 承認待ちの学校, then すべての学校.
// schools: admin_schools() (null while loading). Handlers return promises; the caller reloads.
export function AdminSchoolsView({ schools, error = null, wide = false, onApprove, onDecline, onSetDomains, onAutoApprove }) {
  if (!schools) {
    return error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>;
  }
  const { pending, others } = splitAdminSchools(schools);
  const list = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 };
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "1fr", alignItems: "start" }}>
      <ErrorText>{error}</ErrorText>
      <Panel title={t("admin.pending")}>
        {pending.length === 0
          ? <div style={{ fontSize: 15, color: colors.muted }}>{t("admin.noPending")}</div>
          : <ul style={list}>{pending.map((s) => <PendingSchoolCard key={s.id} school={s} onApprove={onApprove} onDecline={onDecline} />)}</ul>}
      </Panel>
      <Panel title={t("admin.all")}>
        <ul style={list}>{others.map((s) => <AdminSchoolRow key={s.id} school={s} onSetDomains={onSetDomains} onAutoApprove={onAutoApprove} />)}</ul>
      </Panel>
    </div>
  );
}

// Polyvo管理 (platform admins only, from the account menu): loads admin_schools() and reloads after
// every change. The database refuses anyone else (not_platform_admin).
export default function AdminScreen({ onBack, wide = false }) {
  const [schools, setSchools] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    try {
      setSchools(await api.fetchAdminSchools());
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    let current = true;
    api.fetchAdminSchools()
      .then((rows) => { if (current) setSchools(rows); })
      .catch((e) => { console.error(e); if (current) setError(e.message); });
    return () => { current = false; };
  }, []);
  const after = (fn) => async (...args) => { try { await fn(...args); } finally { await load(); } };

  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <StickyBackButton label={t("settings.back")} onClick={onBack} />
      <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: colors.text }}>{t("admin.title")}</h2>
      <AdminSchoolsView
        schools={schools}
        error={error}
        wide={wide}
        onApprove={after((id, domains) => api.adminDecideSchool(id, true, domains))}
        onDecline={after((id) => api.adminDecideSchool(id, false, []))}
        onSetDomains={after(api.adminSetSchoolDomains)}
        onAutoApprove={after(api.setSchoolAutoApprove)}
      />
    </div>
  );
}
