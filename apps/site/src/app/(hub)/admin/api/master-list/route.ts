import { hasAdminSession } from "@/lib/adminAuth";
import { readLocalRecords } from "@/lib/localRecords";
import { VENUES } from "@/lib/venues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Master contact export for the collective: every venue's mailing list in
// one CSV, organized by unit. Unsubscribed rows are included with their
// unsubscribed_at timestamp so downstream tools can filter.

type SubscriberRow = {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  createdAt?: string;
  unsubscribedAt?: string | null;
};

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const header = "venue,name,email,phone,source,created_at,unsubscribed_at";
  const lines: string[] = [header];
  const unavailable: string[] = [];

  for (const venue of VENUES) {
    try {
      const subscribers = await readLocalRecords<SubscriberRow>(venue, "subscribers");
      subscribers.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
      for (const row of subscribers) {
        lines.push(
          [venue.name, row.name ?? "", row.email ?? "", row.phone ?? "", row.source ?? "", row.createdAt ?? "", row.unsubscribedAt ?? ""]
            .map((value) => csvEscape(String(value)))
            .join(","),
        );
      }
    } catch {
      unavailable.push(venue.name);
    }
  }

  if (unavailable.length === VENUES.length) {
    return new Response("No venue lists are reachable. Check the CMS storage tokens.", { status: 502 });
  }
  if (unavailable.length > 0) {
    lines.push(`# unavailable: ${unavailable.join("; ")}`);
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="public-market-contacts.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
