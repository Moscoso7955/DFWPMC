import { C, MONO, SANS, emailButton, emailShell, esc, sendEmail, type VenueEmail } from "./venueEmail";
import { claimEmail, listEmailPlays, listPeople, markKickoffSent, releaseEmail } from "./playbookStore";
import { addDays, daysBetween, shortDate, todayIn, type Person, type Play, type Task } from "./playbookShared";
import { COLLECTIVE as VENUE } from "./venues";

// Playbook's emails, sent at 8 AM venue time by the hourly cron:
//  - Kickoff: on a play's planning start date, to management. What's
//    coming, who's on what first, key dates, a look-book photo.
//  - Monday: to management, every live play's week ahead plus anything late.
//  - Day before: to each task owner with an email, what's due tomorrow.
// Every send is logged first, so a re-run never sends twice.

const first = (name: string) => name.split(/\s+/)[0] || name;
const playUrl = (play: Play, tab?: string) => `${VENUE.siteUrl}/admin/playbook/${play.id}${tab ? `?tab=${tab}` : ""}`;
const ownerName = (t: Task, people: Person[]) => people.find((p) => p.id === t.ownerId)?.name ?? t.ownerLabel;

const h2 = (t: string) =>
  `<h2 style="margin:0 0 12px;padding:0 0 8px;border-bottom:3px solid ${C.red};font-family:${MONO};font-size:16px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:${C.red}">${esc(t)}</h2>`;
const bullets = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items
    .map(
      (i) => `<tr><td valign="top" style="width:18px;padding:7px 0 0"><div style="width:8px;height:8px;background:${C.red}"></div></td>
      <td style="padding:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${i}</td></tr>`,
    )
    .join("")}</table>`;
const row = (inner: string, top = 26) => `<tr><td style="padding:${top}px 28px 0">${inner}</td></tr>`;
const card = (badge: string, title: string, line: string) => `
  <div style="padding:20px 22px;background:${C.yellow};border:3px solid ${C.red}">
    <span style="display:inline-block;margin:0 0 10px;padding:3px 8px;background:${C.red};color:${C.cream};font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase">${esc(badge)}</span>
    <h1 style="margin:0 0 6px;font-family:${MONO};font-size:24px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:${C.red}">${esc(title)}</h1>
    <p style="margin:0;font-family:${SANS};font-size:15px;color:${C.ink}"><strong>${esc(line)}</strong></p>
  </div>`;

function taskLine(play: Play, t: Task, people: Person[], today: string) {
  const due = addDays(play.targetDate, t.offsetDays);
  const who = ownerName(t, people);
  const late = due < today ? ` <span style="color:${C.red}">(late)</span>` : "";
  return `${who ? `<strong>${esc(who)}:</strong> ` : ""}${esc(t.title)} <span style="color:#6b6460">(${due === today ? "today" : `by ${shortDate(due)}`}${t.dueTime ? ` · ${esc(t.dueTime)}` : ""})</span>${late}`;
}

function daysLeft(play: Play, today: string) {
  const n = daysBetween(today, play.targetDate);
  return n > 0 ? `${n} day${n === 1 ? "" : "s"} to go` : n === 0 ? "It's today" : `${-n} days ago`;
}

// ---------------------------------------------------------------------------

export function renderKickoff(play: Play, people: Person[], name: string, today: string): VenueEmail {
  const firstTasks = play.tasks
    .filter((t) => !t.done && addDays(play.targetDate, t.offsetDays) <= addDays(today, 13))
    .slice(0, 12);
  const dates = play.dates.slice(0, 8);
  const photo = play.photos[0];
  const subject = `${play.title} planning starts today · ${daysLeft(play, today)}`;
  const lead =
    play.kickoffMessage ||
    `${play.title} planning officially starts today. Here's what's coming, what you're on first, and the dates to have in your calendar.`;
  const rows = [
    row(card(daysLeft(play, today), play.title, `${play.total} things to do, planned back from ${shortDate(play.targetDate)}.`), 24),
    play.goal ? row(`<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}"><strong>The goal:</strong> ${esc(play.goal)}</p>`, 18) : "",
    firstTasks.length ? row(h2("First up (next two weeks)") + bullets(firstTasks.map((t) => taskLine(play, t, people, today)))) : "",
    dates.length ? row(h2("Key dates") + bullets(dates.map((d) => `<strong>${esc(shortDate(addDays(play.targetDate, d.offsetDays)))}:</strong> ${esc(d.label)}`))) : "",
    photo
      ? row(
          `<img src="${esc(photo.view)}" width="544" alt="" style="display:block;width:100%;height:auto;max-height:320px;object-fit:cover;border:3px solid ${C.red}">
           <p style="margin:6px 0 0;font-family:${MONO};font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.red}">From the look book: ${esc(photo.area || "how we want it")}</p>`,
          22,
        )
      : "",
    row(
      `${emailButton(playUrl(play), `Open ${play.title} →`)}${
        play.lastTimeNotes
          ? `<p style="margin:14px 0 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.ink}"><strong>From last time:</strong> ${esc(play.lastTimeNotes)}</p>`
          : ""
      }`,
      24,
    ),
  ].join("");
  const html = emailShell({
    title: subject,
    kicker: `Playbook · ${shortDate(today)}`,
    greeting: `Hey ${first(name)}!`,
    lead,
    rows,
    footer: "Every Monday you'll get what's due that week. Let's make it a great one!",
  });
  const text = [
    `Hey ${first(name)}!`,
    lead,
    "",
    `${play.title}: ${daysLeft(play, today)}, ${play.total} things to do.`,
    ...(firstTasks.length ? ["", "First up:", ...firstTasks.map((t) => `- ${ownerName(t, people) ? `${ownerName(t, people)}: ` : ""}${t.title} (by ${shortDate(addDays(play.targetDate, t.offsetDays))})`)] : []),
    ...(dates.length ? ["", "Key dates:", ...dates.map((d) => `- ${shortDate(addDays(play.targetDate, d.offsetDays))}: ${d.label}`)] : []),
    "",
    `Open it: ${playUrl(play)}`,
  ].join("\n");
  return { subject, html, text };
}

type WeekPlay = { play: Play; late: Task[]; week: Task[] };

function weekOf(play: Play, today: string): WeekPlay {
  const open = play.tasks.filter((t) => !t.done);
  const due = (t: Task) => addDays(play.targetDate, t.offsetDays);
  return {
    play,
    late: open.filter((t) => due(t) < today),
    week: open.filter((t) => due(t) >= today && due(t) <= addDays(today, 6)),
  };
}

export function renderWeekly(weeks: WeekPlay[], people: Person[], name: string, today: string): VenueEmail {
  const lateCount = weeks.reduce((n, w) => n + w.late.length, 0);
  const weekCount = weeks.reduce((n, w) => n + w.week.length, 0);
  const subject = `This week in the Playbook: ${weekCount} due${lateCount ? `, ${lateCount} late` : ""}`;
  const rows = weeks
    .map(({ play, late, week }) =>
      row(
        card(daysLeft(play, today), play.title, `${play.done} of ${play.total} done`) +
          (late.length ? `<div style="margin:16px 0 0">${h2(`Late (${late.length})`)}${bullets(late.slice(0, 15).map((t) => taskLine(play, t, people, today)))}</div>` : "") +
          (week.length ? `<div style="margin:16px 0 0">${h2("This week")}${bullets(week.slice(0, 25).map((t) => taskLine(play, t, people, today)))}</div>` : "") +
          `<div style="margin:8px 0 0">${emailButton(playUrl(play), `Open ${play.title} →`)}</div>`,
      ),
    )
    .join("");
  const html = emailShell({
    title: subject,
    kicker: `Playbook · week of ${shortDate(today)}`,
    greeting: `Morning, ${first(name)}!`,
    lead: `Here's what's due this week${lateCount ? ", plus what's running late" : ""}.`,
    rows,
    footer: "Tick things off in the Playbook as they get done.",
  });
  const text = [
    `Morning, ${first(name)}!`,
    ...weeks.flatMap(({ play, late, week }) => [
      "",
      `${play.title.toUpperCase()} (${daysLeft(play, today)})`,
      ...late.map((t) => `- LATE: ${t.title} (${ownerName(t, people) || "no owner"})`),
      ...week.map((t) => `- ${t.title} (${ownerName(t, people) || "no owner"}, by ${shortDate(addDays(play.targetDate, t.offsetDays))})`),
      `Open it: ${playUrl(play)}`,
    ]),
  ].join("\n");
  return { subject, html, text };
}

export function renderReminder(items: { play: Play; task: Task }[], name: string, today: string): VenueEmail {
  const tomorrow = addDays(today, 1);
  const subject = `Tomorrow: ${items.length === 1 ? items[0].task.title : `${items.length} things on your list`}`;
  const rows = row(
    h2(`Due ${shortDate(tomorrow)}`) +
      bullets(
        items.map(
          ({ play, task }) =>
            `${esc(task.title)}${task.dueTime ? ` <span style="color:#6b6460">· ${esc(task.dueTime)}</span>` : ""} <span style="color:#6b6460">(${esc(play.title)})</span>${
              task.notes ? `<br><span style="font-size:13px;color:#6b6460">${esc(task.notes.slice(0, 300))}</span>` : ""
            }`,
        ),
      ) +
      `<div style="margin:8px 0 0">${emailButton(playUrl(items[0].play), "Open the Playbook →")}</div>`,
  );
  const html = emailShell({
    title: subject,
    kicker: `Playbook · reminder`,
    greeting: `Hey ${first(name)}!`,
    lead: `A heads-up: ${items.length === 1 ? "this is" : "these are"} due tomorrow.`,
    rows,
    footer: "Tick it off in the Playbook when it's done.",
  });
  const text = [`Hey ${first(name)}!`, `Due tomorrow (${shortDate(tomorrow)}):`, ...items.map(({ play, task }) => `- ${task.title} (${play.title})`), "", playUrl(items[0].play)].join("\n");
  return { subject, html, text };
}

// ---------------------------------------------------------------------------

async function sendOnce(key: string, send: () => Promise<void>) {
  if (!(await claimEmail(key))) return false;
  try {
    await send();
    return true;
  } catch (error) {
    await releaseEmail(key);
    throw error;
  }
}

/** Sends a play's kickoff now (used by the cron and by "Send it now"). */
export async function sendKickoff(play: Play, today: string): Promise<number> {
  const people = await listPeople();
  const managers = people.filter((p) => p.active && p.role === "management" && p.email);
  let sent = 0;
  for (const m of managers) {
    if (await sendOnce(`kickoff:${play.id}:${m.id}`, () => sendEmail({ ...renderKickoff(play, people, m.name, today), to: [m.email] }))) sent++;
  }
  await markKickoffSent(play.id);
  return sent;
}

export type PlaybookRun = { kickoffs: number; weekly: number; reminders: number };

/** Everything due to go out today. Safe to call repeatedly. */
export async function sendDuePlaybookEmails(now = Date.now()): Promise<PlaybookRun> {
  const today = todayIn(VENUE.timeZone, now);
  const plays = await listEmailPlays(today);
  const people = await listPeople();
  const managers = people.filter((p) => p.active && p.role === "management" && p.email);
  const result: PlaybookRun = { kickoffs: 0, weekly: 0, reminders: 0 };

  for (const play of plays) {
    if (play.planStart === today && !play.kickoffSentAt) result.kickoffs += await sendKickoff(play, today);
  }

  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday === 1) {
    const weeks = plays
      .filter((p) => p.targetDate >= today || daysBetween(p.targetDate, today) <= 14)
      .map((p) => weekOf(p, today))
      .filter((w) => w.late.length || w.week.length);
    if (weeks.length) {
      for (const m of managers) {
        if (await sendOnce(`weekly:${today}:${m.id}`, () => sendEmail({ ...renderWeekly(weeks, people, m.name, today), to: [m.email] }))) result.weekly++;
      }
    }
  }

  const tomorrow = addDays(today, 1);
  const byOwner = new Map<string, { play: Play; task: Task }[]>();
  for (const play of plays) {
    for (const task of play.tasks) {
      if (task.done || !task.ownerId || addDays(play.targetDate, task.offsetDays) !== tomorrow) continue;
      byOwner.set(task.ownerId, [...(byOwner.get(task.ownerId) ?? []), { play, task }]);
    }
  }
  for (const [ownerId, items] of byOwner) {
    const owner = people.find((p) => p.id === ownerId && p.active && p.email);
    if (!owner) continue;
    if (await sendOnce(`remind:${today}:${owner.id}`, () => sendEmail({ ...renderReminder(items, owner.name, today), to: [owner.email] }))) result.reminders++;
  }
  return result;
}
