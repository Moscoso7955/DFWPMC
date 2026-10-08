import { hasCollectiveSession } from "@/lib/collective/auth";
import { COLLECTIVE_VENUES } from "@/lib/collective/venues";
import { readVenueRecords, type VenueSubscriber } from "@/lib/collective/venueData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Master contact export for the collective: every venue's mailing list in
// one CSV, organized by unit. Unsubscribed rows are included with their
// unsubscribed_at timestamp so downstream tools (Callidus/Tipsy) can filter.

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  if (!(await hasCollectiveSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const header = "venue,name,email,phone,source,created_at,unsubscribed_at";
  const lines: string[] = [header];
  const unavailable: string[] = [];

  for (const venue of COLLECTIVE_VENUES) {
    try {
      const subscribers = await readVenueRecords<VenueSubscriber>(venue, "subscribers");
      subscribers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (const row of subscribers) {
        lines.push(
          [
            venue.name,
            row.name ?? "",
            row.email ?? "",
            row.phone ?? "",
            row.source ?? "",
            row.createdAt ?? "",
            row.unsubscribedAt ?? "",
          ]
            .map((value) => csvEscape(String(value)))
            .join(","),
        );
      }
    } catch {
      unavailable.push(venue.name);
    }
  }

  if (unavailable.length === COLLECTIVE_VENUES.length) {
    return new Response("No venue lists are reachable. Check the CMS storage tokens.", {
      status: 502,
    });
  }
  if (unavailable.length > 0) {
    lines.push(`# unavailable: ${unavailable.join("; ")}`);
  }

  const filename = `public-market-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
