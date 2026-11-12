"use client";

import { useState } from "react";
import { daysBetween, money, shortDate, type Person, type Play } from "@/lib/playbookShared";
import type { Contact } from "@/lib/contactsShared";
import { usePlay } from "./usePlay";
import CountdownTab from "./CountdownTab";
import BudgetTab from "./BudgetTab";
import SuppliesTab from "./SuppliesTab";
import LookBookTab from "./LookBookTab";
import DetailsTab from "./DetailsTab";
import EmailsTab from "./EmailsTab";

type Props = {
  play: Play;
  people: Person[];
  today: string;
  storageReady: boolean;
  initialTab: string;
  canBudget: boolean;
  canContacts: boolean;
  contacts: Contact[];
};

const TABS = [
  ["countdown", "Countdown"],
  ["budget", "Budget"],
  ["supplies", "Supplies"],
  ["look", "Look book"],
  ["details", "Dates & notes"],
  ["emails", "Emails"],
] as const;

export default function PlayView({ play, people, today, storageReady, initialTab, canBudget, canContacts, contacts }: Props) {
  const tabs = TABS.filter(([id]) => id !== "budget" || canBudget);
  const [tab, setTab] = useState(tabs.some(([id]) => id === initialTab) ? initialTab : "countdown");
  const p = usePlay(play.id);
  const until = daysBetween(today, play.targetDate);
  const pct = play.total ? (play.done / play.total) * 100 : 0;
  const owner = people.find((x) => x.id === play.ownerId)?.name;

  const choose = (id: string) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  };

  const countdownLine = play.isTemplate
    ? "Template: dates below are an example; a copy moves them to its own day."
    : until > 0
      ? `days to ${shortDate(play.targetDate)}`
      : until === 0
        ? "It's today!"
        : `days since ${shortDate(play.targetDate)}`;

  return (
    <section className="admin-mailing-list pb">
      <a className="admin-back-link" href="/admin/playbook">
        <span aria-hidden="true">←</span> Playbook
      </a>
      <div className="pb-hero">
        <span className="pb-unit-chip">{play.isTemplate ? "Template" : play.kind}</span>
        <h1>{play.title}</h1>
        <div className="pb-countdown">
          {!play.isTemplate ? <strong>{Math.abs(until)}</strong> : null}
          <span>
            {countdownLine}
            <em>
              Planned back from the day
              {play.planStart && !play.isTemplate
                ? ` · planning ${play.planStart > today ? "starts" : "started"} ${shortDate(play.planStart)}`
                : ""}
              {owner ? ` · owner ${owner}` : ""}
            </em>
          </span>
        </div>
        {play.goal ? (
          <p className="pb-goal">
            <b>Goal:</b> {play.goal}
          </p>
        ) : null}
        <span className="pb-progress pb-progress--big" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
        <p className="pb-goal">
          {play.done} of {play.total} done
          {play.overdue ? <b className="pb-late"> · {play.overdue} late</b> : null}
          {!canBudget ? "" : play.budgetCents != null ? ` · ${money(play.spentCents)} of ${money(play.budgetCents)} spent` : play.spentCents ? ` · ${money(play.spentCents)} spent` : ""}
        </p>
      </div>

      <nav className="pb-tabs" aria-label="Play sections">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "is-active" : undefined} onClick={() => choose(id)}>
            {label}
          </button>
        ))}
      </nav>
      {p.error ? (
        <p className="admin-photos-warning" role="alert">
          {p.error}
        </p>
      ) : null}

      {tab === "countdown" ? <CountdownTab play={play} people={people} today={today} p={p} contacts={contacts} canContacts={canContacts} /> : null}
      {tab === "budget" && canBudget ? <BudgetTab play={play} p={p} /> : null}
      {tab === "supplies" ? <SuppliesTab play={play} p={p} storageReady={storageReady} /> : null}
      {tab === "look" ? <LookBookTab play={play} p={p} storageReady={storageReady} /> : null}
      {tab === "details" ? <DetailsTab play={play} people={people} p={p} /> : null}
      {tab === "emails" ? <EmailsTab play={play} people={people} today={today} p={p} /> : null}
    </section>
  );
}
