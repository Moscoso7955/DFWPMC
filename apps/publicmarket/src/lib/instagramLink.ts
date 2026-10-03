export function getInstagramHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (/^(www\.)?instagram\.com\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }

  const handle = trimmed.replace(/^@/, "").replace(/\/+$/, "");
  if (!handle) return null;

  return `https://instagram.com/${handle}`;
}
