# Mailing-list sync API

Bar Phoebe is the source of truth for its newsletter list; the
CallidusCo Owner Portal (the mailing app) pulls from it and posts
unsubscribes back. Auth is one shared bearer secret, the
`MAILING_LIST_SYNC_TOKEN` env var — same value on both apps; never
commit it.

## GET /api/mailing-list/subscribers

Header: `Authorization: Bearer <MAILING_LIST_SYNC_TOKEN>`
Optional `?since=<ISO>` → only rows with `updated_at` newer than that.

Returns every row — including unsubscribed ones, with `unsubscribedAt`
set — so the mailing app honors removals made here (site opt-outs,
admin removals):

```json
{
  "subscribers": [
    { "id": 42, "name": "Jane", "email": "a@b.com", "source": "newsletter",
      "createdAt": "…", "updatedAt": "…", "unsubscribedAt": null }
  ],
  "syncedAt": "…"
}
```

`name` may be an empty string for historical rows we never collected a
name for. All new signups (newsletter form and contact form) capture a
name. A one-time backfill in `ensureSchema()` fills in names for
subscribers who don't have one, pulling from the most recent
`contact_submissions` row for that email.

## POST /api/mailing-list/unsubscribe

Same auth. Body `{ "email": "...", "reason": "..." }`. Idempotent —
already-unsubscribed rows keep their original timestamp and reason.
Reasons the mailing app sends: `user_click` (unsubscribed from a
campaign), `bounced` (dead address), `complained` (marked spam) —
stored in `unsubscribe_reason` so a bounce stays distinguishable from
a real opt-out.

## Data rules

- Rows are **never deleted** — `newsletter_subscribers` is the
  compliance record. Unsubscribing sets `unsubscribed_at`.
- A fresh signup from a previously-unsubscribed address is new
  consent: it clears the unsubscribe and bumps `updated_at`.
- Schema (columns `unsubscribed_at`, `unsubscribe_reason`,
  `updated_at` + index) self-migrates on first use via
  `ensureSchema()` in `src/lib/subscribersStore.ts`.
