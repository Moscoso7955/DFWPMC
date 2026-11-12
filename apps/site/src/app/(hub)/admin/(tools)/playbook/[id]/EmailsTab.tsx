"use client";

import { addDays, daysBetween, shortDate, type Person, type Play } from "@/lib/playbookShared";
import { api } from "../playbookClient";
import { InlineArea } from "./Inline";
import type { PlayApi } from "./usePlay";

export default function EmailsTab({ play, people, today, p }: { play: Play; people: Person[]; today: string; p: PlayApi }) {
  const managers = people.filter((x) => x.active && x.role === "management");
  const withEmail = managers.filter((x) => x.email);
  const owners = [...new Set(play.tasks.map((t) => t.ownerId).filter(Boolean))].map((id) => people.find((x) => x.id === id)).filter(Boolean) as Person[];
  const ownersNoEmail = owners.filter((o) => !o.email);
  const preview = (kind: string) => `/admin/api/playbook/plays/${play.id}/email?kind=${kind}`;
  const end = addDays(play.targetDate, 14);

  if (play.isTemplate) {
    return (
      <div className="pb-emails">
        <p className="admin-mailing-list-note">Templates don&apos;t send anything. Plays copied from this one get the kickoff, Monday and reminder emails.</p>
        <label className="pb-email-msg">
          <span>Kickoff message (copied into each play)</span>
          <InlineArea value={play.kickoffMessage} rows={3} onSave={(v) => p.patchPlay({ kickoffMessage: v })} />
        </label>
      </div>
    );
  }

  const kickoffStatus = play.kickoffSentAt
    ? `Sent ${shortDate(play.kickoffSentAt.slice(0, 10))}`
    : !play.planStart
      ? "Set a planning start date"
      : play.planStart > today
        ? `In ${daysBetween(today, play.planStart)} days`
        : play.planStart === today
          ? "Today, 8 AM"
          : "Start date passed";

  return (
    <div className="pb-emails">
      <label className="pb-toggle">
        <input type="checkbox" checked={play.emailsEnabled} onChange={(e) => p.patchPlay({ emailsEnabled: e.target.checked })} />
        <span>
          <strong>Emails for this play are {play.emailsEnabled ? "on" : "off"}.</strong> Everything goes out at 8 AM, so planning starts on time
          without anyone remembering to start it.
        </span>
      </label>
      <ul>
        <li>
          <span className="pb-email-when">{play.planStart ? `${shortDate(play.planStart)} · 8 AM` : "Planning start"}</span>
          <strong>Kickoff: what&apos;s coming, who&apos;s on what first, key dates</strong>
          <span>To: management</span>
          <em className={play.kickoffSentAt ? "is-sent" : undefined}>{kickoffStatus}</em>
          <a href={preview("kickoff")} target="_blank" rel="noreferrer">
            Preview
          </a>
        </li>
        <li>
          <span className="pb-email-when">Mondays · 8 AM</span>
          <strong>This week + anything late</strong>
          <span>To: management</span>
          <em>{play.planStart ? `${shortDate(play.planStart)} – ${shortDate(end)}` : "From the planning start"}</em>
          <a href={preview("weekly")} target="_blank" rel="noreferrer">
            Preview
          </a>
        </li>
        <li>
          <span className="pb-email-when">Day before · 8 AM</span>
          <strong>Reminder of what&apos;s due tomorrow</strong>
          <span>To: each task&apos;s owner</span>
          <em>{owners.length ? `${owners.length - ownersNoEmail.length} of ${owners.length} owners reachable` : "No owners yet"}</em>
          <a href={preview("reminder")} target="_blank" rel="noreferrer">
            Preview
          </a>
        </li>
      </ul>
      {!play.kickoffSentAt && play.planStart && play.planStart < today ? (
        <button
          type="button"
          className="pb-btn"
          onClick={async () => {
            if (!window.confirm(`Send the ${play.title} kickoff to management now?`)) return;
            const r = await p.run(() => api<{ sent: number }>("POST", `/admin/api/playbook/plays/${play.id}/email`));
            if (r) window.alert(`Sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}.`);
          }}
        >
          Send the kickoff now
        </button>
      ) : null}
      <label className="pb-email-msg">
        <span>Kickoff message</span>
        <InlineArea
          value={play.kickoffMessage}
          rows={3}
          placeholder={`${play.title} planning officially starts today. Here's what's coming, what you're on first, and the dates to have in your calendar.`}
          onSave={(v) => p.patchPlay({ kickoffMessage: v })}
        />
      </label>
      <p className="admin-pe-hint">
        Management: {withEmail.length ? withEmail.map((x) => x.name).join(", ") : "nobody with an email yet"}.{" "}
        {managers.length > withEmail.length ? `${managers.length - withEmail.length} without an email won't get anything. ` : ""}
        {ownersNoEmail.length ? `No email for ${ownersNoEmail.map((o) => o.name).join(", ")}, so no reminders for them. ` : ""}
        <a href="/admin/settings">Edit people</a>
      </p>
    </div>
  );
}
