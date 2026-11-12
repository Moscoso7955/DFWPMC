// Training notes for the team, one per feature shipped to
// fwpublicmarket.com. The morning after a note's `shippedAt`, the site
// emails it to everyone with "Update emails" switched on (see
// releaseDigest.ts). Add one whenever a real feature or addition ships;
// fixes, tweaks and copy edits don't get a note. Newest first.
//
// Write for the team, not developers: what guests see, how to use it on
// the night, and what to do with it. Screenshots live in
// public/release-notes/<id>/.

export type ReleaseShot = {
  /** Path under public/, e.g. /release-notes/<id>/guest-enter.jpg */
  src: string;
  caption: string;
  /** Phone screenshots sit two to a row; wide ones take the full width. */
  kind: "phone" | "wide";
};

export type ReleaseSection = {
  heading: string;
  intro?: string;
  points: string[];
  shots?: ReleaseShot[];
  /** Ready-to-use copy, e.g. post captions. */
  examples?: string[];
};

export type ReleaseNote = {
  /** Stable id; never reuse or change once shipped. */
  id: string;
  /** When it went live, with the Fort Worth offset, e.g. 2026-11-11T18:00:00-06:00. */
  shippedAt: string;
  title: string;
  /** One line that sells it. */
  hook: string;
  /** Two or three sentences: what it is and why it's good for us. */
  whatItIs: string;
  /** Pages or admin paths, e.g. "Admin → Settings". */
  where: string[];
  sections: ReleaseSection[];
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: "2026-11-11-one-blackbook",
    shippedAt: "2026-11-11T18:00:00-06:00",
    title: "One Blackbook for the whole Market",
    hook: "One VIP and banned list covers Willow, Madrone and the Cafe. 📒",
    whatItIs:
      "The Blackbook is now one list for the whole building at fwpublicmarket.com/blackbook. A guest marked VIP or banned at one venue is marked everywhere, and door staff sign in with the same login as everyone else — no separate door password.",
    where: [
      "fwpublicmarket.com/blackbook (the old per-venue Blackbook links land here too).",
      "Who can see it: anyone whose role includes Blackbook view; edits need Blackbook edits.",
    ],
    sections: [
      {
        heading: "On the door",
        points: [
          "Search by name; VIPs and Banned sit on their own tabs.",
          "Photos are private — they only load for signed-in staff.",
          "A ban is house-wide: one entry covers all three venues.",
        ],
      },
    ],
  },
  {
    id: "2026-11-11-one-signin",
    shippedAt: "2026-11-11T17:00:00-06:00",
    title: "One sign-in for the collective",
    hook: "Sign in once, work in any venue's editor. 🔑",
    whatItIs:
      "The whole Public Market now runs as one site with one admin sign-in. The Admin Portal at fwpublicmarket.com/admin opens all three venue editors, the shared settings, and the collective analytics — one session, no second password per venue.",
    where: [
      "fwpublicmarket.com/admin — the selector, with each venue's editor one click away.",
      "Admin → Settings — invite people and choose what each role can reach (once the database and Google sign-in are switched on).",
    ],
    sections: [
      {
        heading: "What changed for the team",
        points: [
          "One login covers Willow, Madrone and the Cafe — venue editors, analytics and the master contact list.",
          "Google sign-in is coming next: everyone gets their own invite instead of the shared password.",
          "The selector screen shows each venue's mailing list, contact messages and menu taps at a glance.",
        ],
      },
    ],
  },
];
