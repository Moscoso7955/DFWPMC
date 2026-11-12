"use client";

import { useRouter } from "next/navigation";
import type { ContestSummary } from "@/lib/contestStore";
import { clockLabel, dayLabel, type ContestForm } from "@/lib/contestShared";
import { postJson } from "@/lib/photoClient";
import PhotoEventForm from "./PhotoEventForm";

/** The coming Saturday (or today, if it's Saturday) in Kansas City. */
function nextSaturday() {
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }) + "T12:00:00Z");
  today.setUTCDate(today.getUTCDate() + ((6 - today.getUTCDay() + 7) % 7));
  return today.toISOString().slice(0, 10);
}

function statusOf(c: ContestSummary) {
  if (c.uploads === "open" || c.voting === "open") return { label: `Live now · ${c.entries} entries`, live: true };
  if (c.voting === "after") return { label: c.nightId ? "Done · in Market Nights" : `Done · ${c.entries} entries, ${c.votes} votes`, live: false };
  return { label: "Coming up", live: false };
}

export default function PhotoEventsView({ contests, checkReady }: { contests: ContestSummary[]; checkReady: boolean }) {
  const router = useRouter();
  const blank: ContestForm = {
    title: "",
    date: nextSaturday(),
    uploadOpen: "21:00",
    uploadClose: "23:30",
    voteOpen: "21:00",
    voteClose: "01:00",
    moderation: "auto",
    hideAfterReports: true,
    categories: [{ id: "", name: "Best costume" }],
    onePrizeEach: true,
  };

  return (
    <section className="admin-mailing-list admin-photos">
      <a className="admin-back-link" href="/admin/photos">
        <span aria-hidden="true">←</span> Photos
      </a>
      <div className="admin-mailing-list-header">
        <h1>Photo Events</h1>
      </div>
      <p className="admin-mailing-list-note">
        Contests where guests upload a photo and everyone votes, like a costume contest. Entries only work inside the
        window you set. Afterwards, move the whole event into Market Nights.
      </p>
      {!checkReady ? (
        <p className="admin-photos-warning">
          The automatic photo check is off until ANTHROPIC_API_KEY is added in Vercel, so every entry waits for staff to
          tap Approve.
        </p>
      ) : null}

      {contests.length ? (
        <ul className="admin-photos-list">
          {contests.map((c) => {
            const status = statusOf(c);
            return (
              <li key={c.id}>
                <a className={`admin-photos-row${status.live ? " admin-photos-row--live" : ""}`} href={`/admin/photos/events/${c.id}`}>
                  <span className="admin-photos-night">
                    <strong>{c.title}</strong>
                    <span>
                      {dayLabel(c.date)} · entries {clockLabel(c.uploadOpensAt)}–{clockLabel(c.uploadClosesAt)} · voting{" "}
                      {clockLabel(c.voteOpensAt)}–{clockLabel(c.voteClosesAt)}
                    </span>
                  </span>
                  <span className={`admin-pe-status${status.live ? " is-live" : ""}`}>
                    {status.label}
                    {c.held ? ` · ${c.held} held` : ""}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      <h2 className="admin-photos-section">New photo event</h2>
      <PhotoEventForm
        initial={blank}
        submitLabel="Create photo event"
        onSubmit={async (form) => {
          try {
            const { id } = await postJson<{ id: string }>("/admin/api/contests", form);
            router.push(`/admin/photos/events/${id}`);
            return null;
          } catch (error) {
            return error instanceof Error ? error.message : "Couldn't save.";
          }
        }}
      />
    </section>
  );
}
