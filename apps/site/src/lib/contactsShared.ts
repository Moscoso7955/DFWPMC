// Contacts: vendors and outside help (the Christmas lights guy, the tree
// lot, the DJ). Shared by server code and the screens.

export type Contact = {
  id: string;
  name: string;
  company: string;
  what: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  tags: string[];
};

export type ContactInput = Partial<Omit<Contact, "id">>;

/** A contact attached to a play (taskId null) or one of its tasks. */
export type PlayContact = { linkId: string; taskId: string | null; label: string; contact: Contact };

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function webHref(site: string) {
  if (!site) return "";
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

/**
 * Reads contact cards (.vcf) shared from a phone's Contacts app. Handles
 * several cards in one file, folded lines, escapes and quoted-printable.
 */
export function parseVCards(text: string): ContactInput[] {
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").replace(/=\n/g, "");
  const cards: ContactInput[] = [];
  let card: (ContactInput & { first?: string; last?: string }) | null = null;
  const unescape = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
  const qp = (v: string) => {
    try {
      return decodeURIComponent(v.replace(/%/g, "%25").replace(/=([0-9A-F]{2})/gi, "%$1"));
    } catch {
      return v;
    }
  };
  for (const raw of unfolded.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^BEGIN:VCARD$/i.test(line)) {
      card = {};
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (card) {
        const name = card.name || [card.first, card.last].filter(Boolean).join(" ") || card.company || "";
        if (name) cards.push({ name, company: card.company ?? "", what: card.what ?? "", phone: card.phone ?? "", email: card.email ?? "", website: card.website ?? "", notes: card.notes ?? "", tags: [] });
      }
      card = null;
      continue;
    }
    if (!card) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    let value = line.slice(colon + 1);
    const [prop, ...params] = head.split(";");
    const key = prop.replace(/^item\d+\./i, "").toUpperCase();
    if (params.some((p) => /QUOTED-PRINTABLE/i.test(p))) value = qp(value);
    value = unescape(value);
    if (!value) continue;
    if (key === "FN") card.name = value;
    else if (key === "N") {
      const [last, first] = value.split(";");
      card.last = last?.trim();
      card.first = first?.trim();
    } else if (key === "ORG") card.company = value.split(";").filter(Boolean).join(" · ");
    else if (key === "TITLE" && !card.what) card.what = value;
    else if (key === "TEL" && !card.phone) card.phone = value;
    else if (key === "EMAIL" && !card.email) card.email = value;
    else if (key === "URL" && !card.website) card.website = value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    else if (key === "NOTE") card.notes = value;
  }
  return cards;
}
