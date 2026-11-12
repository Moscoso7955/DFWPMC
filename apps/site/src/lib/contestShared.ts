// Photo events (costume contests): shared by server code and browser
// components (no server-only imports).

export const CONTEST_TZ = "America/Chicago";

export type ContestPhase = "before" | "open" | "after";
export type ModerationMode = "auto" | "manual";
export type EntryStatus = "uploading" | "live" | "held" | "removed";

/** A prize people vote on separately, e.g. "Scariest". */
export type ContestCategory = { id: string; name: string };

export const MAX_CATEGORIES = 10;
/** Votes cast before categories existed belong to this one. */
export const DEFAULT_CATEGORY: ContestCategory = { id: "main", name: "Best costume" };
export const CATEGORY_SUGGESTIONS = ["Best costume", "Scariest", "Most original", "Funniest", "Best group", "Best couple", "Sexiest", "Best makeup", "Most effort", "Best pop culture"];

/** Cleans up a stored or submitted category list; always at least one. */
export function normalizeCategories(value: unknown): ContestCategory[] {
  const seen = new Set<string>();
  const list = (Array.isArray(value) ? value : [])
    .map((c) => ({
      id: typeof c?.id === "string" && /^[a-z0-9]{1,12}$/.test(c.id) ? c.id : "",
      name: typeof c?.name === "string" ? c.name.replace(/\s+/g, " ").trim().slice(0, 40) : "",
    }))
    .filter((c) => c.name)
    .slice(0, MAX_CATEGORIES)
    .map((c) => {
      let id = c.id || Math.random().toString(36).slice(2, 10);
      while (seen.has(id)) id = Math.random().toString(36).slice(2, 10);
      seen.add(id);
      return { id, name: c.name };
    });
  return list.length ? list : [DEFAULT_CATEGORY];
}

/** One calendar day's contest, as the calendar shows it. */
export type CalendarContest = { id: string; date: string; title: string; label: string };

export type ContestTimes = {
  uploadOpensAt: string;
  uploadClosesAt: string;
  voteOpensAt: string;
  voteClosesAt: string;
};

export function phaseOf(opensAt: string, closesAt: string, now = Date.now()): ContestPhase {
  if (now < Date.parse(opensAt)) return "before";
  if (now < Date.parse(closesAt)) return "open";
  return "after";
}

/** Minutes the Chicago clock is ahead of UTC at an instant (e.g. -300 in CDT). */
function chicagoOffsetMinutes(instant: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CONTEST_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(instant / 60000) * 60000) / 60000);
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Chicago wall-clock date + "HH:MM" to an ISO instant. */
export function chicagoToIso(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let instant = wall - chicagoOffsetMinutes(wall) * 60000;
  const again = wall - chicagoOffsetMinutes(instant) * 60000;
  if (again !== instant) instant = again;
  return new Date(instant).toISOString();
}

const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/**
 * The night's windows from the times staff typed. Everything belongs to
 * the night of `date`: an opening time before 6 AM is after midnight, and
 * a closing time at or before its opening time is the next morning
 * (9:00 PM to 1:00 AM closes at 1 AM the next day).
 */
export function contestTimesFrom(
  date: string,
  input: { uploadOpen: unknown; uploadClose: unknown; voteOpen: unknown; voteClose: unknown },
): ContestTimes | null {
  if (![input.uploadOpen, input.uploadClose, input.voteOpen, input.voteClose].every(isTime)) return null;
  const opening = (time: string) => (time < "06:00" ? addDays(date, 1) : date);
  const closing = (openDay: string, open: string, close: string) => (close <= open ? addDays(openDay, 1) : openDay);
  const uploadDay = opening(input.uploadOpen as string);
  const voteDay = opening(input.voteOpen as string);
  return {
    uploadOpensAt: chicagoToIso(uploadDay, input.uploadOpen as string),
    uploadClosesAt: chicagoToIso(closing(uploadDay, input.uploadOpen as string, input.uploadClose as string), input.uploadClose as string),
    voteOpensAt: chicagoToIso(voteDay, input.voteOpen as string),
    voteClosesAt: chicagoToIso(closing(voteDay, input.voteOpen as string, input.voteClose as string), input.voteClose as string),
  };
}

/** "9:00 PM" in Chicago time. */
export function clockLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: CONTEST_TZ, hour: "numeric", minute: "2-digit" });
}

/** "21:00" in Chicago time, for <input type="time">. */
export function clockValue(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: CONTEST_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** "Sat, Oct 31" */
export function dayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Saturday" or "Sat, Oct 31" or "tonight", relative to now in Chicago. */
export function whenLabel(iso: string, now = Date.now()) {
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: CONTEST_TZ });
  const target = Date.parse(iso);
  // Early-morning times still belong to the night before.
  const night = (t: number) => fmt(t - 6 * 3600 * 1000);
  if (night(target) === night(now)) return "tonight";
  if (target - now < 6 * 24 * 3600 * 1000 && target > now) {
    return new Date(target).toLocaleDateString("en-US", { timeZone: CONTEST_TZ, weekday: "long" });
  }
  return new Date(target).toLocaleDateString("en-US", { timeZone: CONTEST_TZ, weekday: "short", month: "short", day: "numeric" });
}

export function calendarLabel(times: ContestTimes) {
  return `Enter ${clockLabel(times.uploadOpensAt)}–${clockLabel(times.uploadClosesAt)} · vote until ${clockLabel(times.voteClosesAt)}`;
}

export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "photo-event"
  );
}

export type ContestForm = {
  title: string;
  date: string;
  uploadOpen: string;
  uploadClose: string;
  voteOpen: string;
  voteClose: string;
  moderation: ModerationMode;
  hideAfterReports: boolean;
  categories: ContestCategory[];
  onePrizeEach: boolean;
};

export type ParsedContest = ContestTimes & {
  title: string;
  date: string;
  moderation: ModerationMode;
  hideAfterReports: number;
  categories: ContestCategory[];
  onePrizeEach: boolean;
};

/** Validates what staff typed in the Photo Event form. */
export function parseContestForm(body: Record<string, unknown>): { ok: true; input: ParsedContest } | { ok: false; error: string } {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  const date = typeof body.date === "string" ? body.date : "";
  if (!title) return { ok: false, error: "Give the photo event a name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Pick the date." };
  const times = contestTimesFrom(date, {
    uploadOpen: body.uploadOpen,
    uploadClose: body.uploadClose,
    voteOpen: body.voteOpen,
    voteClose: body.voteClose,
  });
  if (!times) return { ok: false, error: "Fill in all four times." };
  if (Array.isArray(body.categories) && !body.categories.some((c) => typeof c?.name === "string" && c.name.trim())) {
    return { ok: false, error: "Name at least one winner." };
  }
  if (Date.parse(times.voteClosesAt) < Date.parse(times.uploadOpensAt)) {
    return { ok: false, error: "Voting has to close after entries open." };
  }
  return {
    ok: true,
    input: {
      title,
      date,
      ...times,
      moderation: body.moderation === "manual" ? "manual" : "auto",
      hideAfterReports: body.hideAfterReports === false ? 0 : 3,
      categories: normalizeCategories(body.categories),
      onePrizeEach: body.onePrizeEach !== false,
    },
  };
}

export function contestFormFrom(
  contest: ContestTimes & {
    title: string;
    date: string;
    moderation: ModerationMode;
    hideAfterReports: number;
    categories: ContestCategory[];
    onePrizeEach: boolean;
  },
): ContestForm {
  return {
    title: contest.title,
    date: contest.date,
    uploadOpen: clockValue(contest.uploadOpensAt),
    uploadClose: clockValue(contest.uploadClosesAt),
    voteOpen: clockValue(contest.voteOpensAt),
    voteClose: clockValue(contest.voteClosesAt),
    moderation: contest.moderation,
    hideAfterReports: contest.hideAfterReports > 0,
    categories: contest.categories,
    onePrizeEach: contest.onePrizeEach,
  };
}
