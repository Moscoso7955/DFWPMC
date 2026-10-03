// A QR either encodes the bare token or the /t/<token> URL we ship
// in the email. Accept both; strip trailing slashes and query strings.
export function extractTicketToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/t\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  } catch {
    // Not a URL — fall through and treat the whole string as a token.
  }

  const cleaned = trimmed.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  const bareMatch = cleaned.match(/([A-Za-z0-9_-]{20,})$/);
  return bareMatch ? bareMatch[1] : null;
}
