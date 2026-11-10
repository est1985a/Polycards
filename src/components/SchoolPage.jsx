import { useState } from 'react';
import { useAction } from '../lib/useAction';
import { colors } from '../styles/theme';
import { domainsLabel, schoolLine } from '../lib/schools';
import { dateText } from '../lib/classes';
import { Panel, ErrorText } from './ClassFields';
import { ConfirmLine } from './ClassPage';
import ToggleSwitch from './ToggleSwitch';
import SegmentedSwitch from './SegmentedSwitch';
import { ghostSmall, primarySmall, dangerSmall } from '../styles/forms';
import { t } from '../i18n';

const rowStyle = { display: "grid", gap: 8, padding: "10px 12px", borderRadius: 12, background: colors.surface2 };

function Badge({ children, tone = "accent" }) {
  const c = tone === "accent" ? colors.accentText : colors.muted;
  return (
    <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 999, border: `1.5px solid ${c}`, color: c, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// One join request (admins): name, account, email, date; 承認する / 却下する (asks first).
export function RequestRow({ request, onDecide, initialMode = null }) {
  const [mode, setMode] = useState(initialMode); // null | 'decline'
  const action = useAction();
  const name = request.display_name || request.account_name;
  return (
    <li data-school-request={request.user_id} style={rowStyle}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ flex: "1 1 180px", minWidth: 0, display: "grid", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{name}</span>
          <span style={{ fontSize: 13, color: colors.muted, overflowWrap: "anywhere" }}>
            {[request.account_name !== name ? request.account_name : null, request.email].filter(Boolean).join(" · ")}
          </span>
          <span style={{ fontSize: 12, color: colors.muted }}>{t("school.requestedOn", { date: dateText(request.requested_at) })}</span>
        </span>
        {mode === null && (
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setMode("decline")} disabled={action.busy} style={ghostSmall}>{t("school.decline")}</button>
            <button type="button" onClick={() => action.run(() => onDecide(request.user_id, true))} disabled={action.busy} style={{ ...primarySmall, opacity: action.busy ? 0.6 : 1 }}>
              {action.busy ? "…" : t("school.approve")}
            </button>
          </span>
        )}
      </div>
      {mode === "decline" && (
        <ConfirmLine
          text={t("school.declineConfirm", { name })}
          yesLabel={t("school.decline")}
          danger
          busy={action.busy}
          onYes={() => action.run(() => onDecide(request.user_id, false))}
          onCancel={() => { setMode(null); action.clearError(); }}
        />
      )}
      <ErrorText>{action.error}</ErrorText>
    </li>
  );
}

// One teacher of the school: name, 管理者 / あなた badges, number of classes. Admins see
// 管理者にする / 管理者を外す and 学校から外す (asks first) on other teachers.
export function SchoolTeacherRow({ teacher, isAdmin, onSetAdmin, onRemove, initialMode = null }) {
  const [mode, setMode] = useState(initialMode); // null | 'remove'
  const action = useAction();
  const admin = teacher.role === "admin";
  const canManage = isAdmin && !teacher.is_me;
  return (
    <li data-school-teacher={teacher.user_id} style={rowStyle}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ flex: "1 1 160px", minWidth: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{teacher.display_name}</span>
          {admin && <Badge>{t("school.adminBadge")}</Badge>}
          {teacher.is_me && <Badge tone="muted">{t("school.me")}</Badge>}
          <span style={{ fontSize: 13, color: colors.muted }}>{t("school.classCount", { n: teacher.class_count ?? 0, count: teacher.class_count ?? 0 })}</span>
        </span>
        {canManage && mode === null && (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" onClick={() => action.run(() => onSetAdmin(teacher.user_id, !admin))} disabled={action.busy} style={ghostSmall}>
              {admin ? t("school.removeAdmin") : t("school.makeAdmin")}
            </button>
            <button type="button" onClick={() => setMode("remove")} disabled={action.busy} style={dangerSmall}>{t("school.remove")}</button>
          </span>
        )}
      </div>
      {mode === "remove" && (
        <ConfirmLine
          text={t("school.removeConfirm", { name: teacher.display_name })}
          yesLabel={t("school.remove")}
          danger
          busy={action.busy}
          onYes={() => action.run(() => onRemove(teacher.user_id))}
          onCancel={() => { setMode(null); action.clearError(); }}
        />
      )}
      <ErrorText>{action.error}</ErrorText>
    </li>
  );
}

// 先生 tab → 学校: the school (name, prefecture, verified domains, domain auto-approve for admins),
// 参加リクエスト (admins) and the teachers.
// data: fetchMySchool() (null while loading); error: a load error.
// onDecide(userId, approve), onSetAdmin(userId, admin), onRemove(userId), onAutoApprove(on): promises;
// the caller reloads the school afterwards.
export default function SchoolPage({ data, error = null, wide = false, onDecide, onSetAdmin, onRemove, onAutoApprove }) {
  const auto = useAction();
  if (!data) {
    return error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>;
  }
  const { school, domains, is_admin: isAdmin, teachers, requests } = data;
  const autoOn = !!school?.auto_approve_domain;

  const schoolPanel = (
    <Panel title={school?.name ?? ""}>
      <div style={{ display: "grid", gap: 6, fontSize: 14, color: colors.muted }}>
        {school && <span>{schoolLine(school)}</span>}
        <span data-school-domains="">{domains.length > 0 ? t("school.domains", { domains: domainsLabel(domains) }) : t("school.noDomains")}</span>
      </div>
      {isAdmin && domains.length > 0 && (
        <div style={{ display: "grid", gap: 4 }}>
          <button
            type="button"
            role="switch"
            aria-checked={autoOn}
            disabled={auto.busy}
            onClick={() => auto.run(() => onAutoApprove(!autoOn))}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, padding: "0 4px",
              background: "transparent", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: colors.text, textAlign: "left",
            }}
          >
            <span>{t("school.autoApprove")}</span>
            <ToggleSwitch on={autoOn} />
          </button>
          <span style={{ fontSize: 13, color: colors.gold }}>{t("school.autoApproveNote")}</span>
          <ErrorText>{auto.error}</ErrorText>
        </div>
      )}
      {isAdmin && <span style={{ fontSize: 13, color: colors.muted }}>{t("school.adminNote")}</span>}
    </Panel>
  );

  const requestPanel = isAdmin && (
    <Panel title={t("school.requests")}>
      {requests.length === 0
        ? <div style={{ fontSize: 15, color: colors.muted }}>{t("school.noRequests")}</div>
        : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {requests.map((r) => <RequestRow key={r.user_id} request={r} onDecide={onDecide} />)}
          </ul>
        )}
    </Panel>
  );

  const teacherPanel = (
    <Panel title={t("school.teachers", { n: teachers.length, count: teachers.length })}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {teachers.map((tc) => (
          <SchoolTeacherRow key={tc.user_id} teacher={tc} isAdmin={isAdmin} onSetAdmin={onSetAdmin} onRemove={onRemove} />
        ))}
      </ul>
    </Panel>
  );

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: wide ? "minmax(0, 1fr) 360px" : "1fr", alignItems: "start", textAlign: "left" }}>
      <div style={{ display: "grid", gap: 16 }}>
        {requestPanel}
        {teacherPanel}
      </div>
      <div style={{ display: "grid", gap: 16, gridRow: wide ? "auto" : 1 }}>
        {schoolPanel}
      </div>
    </div>
  );
}

// The クラス | 学校 switch at the top of the 先生 tab. requests: join requests waiting (admins),
// shown as 学校（2）.
export function TeacherAreaSwitch({ value, onChange, requests = 0 }) {
  return (
    <div style={{ maxWidth: 360 }}>
      <SegmentedSwitch
        label={t("school.switchLabel")}
        value={value}
        onChange={onChange}
        options={[
          { value: "classes", label: t("school.tabClasses") },
          { value: "school", label: requests > 0 ? t("school.tabSchoolRequests", { n: requests, count: requests }) : t("school.tabSchool") },
        ]}
      />
    </div>
  );
}
