# Mailing list

This site has no database — the FW Public Market mailing list lives in
the CallidusCo Owner Portal, where campaigns are composed and sent.

- The homepage signup form posts to `/api/newsletter-subscribe`, which
  forwards server-side to the portal's `mail-signup` function with the
  `MAILING_LIST_SYNC_TOKEN` env var as the bearer credential (same
  value stored on the venue's sender profile in the portal). Never
  commit the token.
- Unsubscribes are handled entirely by the portal (per-email
  unsubscribe links, bounce/complaint suppression). A fresh signup
  from a previously-unsubscribed address counts as new consent;
  bounced or complaining addresses stay suppressed.
- `MAILING_LIST_API_URL` can override the portal endpoint (used in
  tests).
