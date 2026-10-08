import "server-only";
import { get } from "@vercel/blob";
import { COLLECTIVE_VENUES, type CollectiveVenue } from "./venues";

// Read-only access to the record documents each venue app keeps in its
// private Blob store (src/lib/localRecords.ts + cmsStorage.ts in the venue
// apps): {venueId}/{scope}/cms/{name}.json. The hub only aggregates —
// writes stay in the venue apps.

export type VenueSubscriber = {
  name: string;
  email: string;
  phone: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  unsubscribedAt: string | null;
};

export type VenueMenuClick = { target: string; source: string; createdAt: string };
export type VenueContact = { name: string; email: string; message: string; createdAt: string };

function venueToken(venue: CollectiveVenue) {
  const value = process.env[venue.tokenEnv];
  if (!value) throw new Error(`Missing ${venue.tokenEnv}.`);
  return value;
}

export async function readVenueRecords<T>(venue: CollectiveVenue, name: string): Promise<T[]> {
  const scope = process.env.CMS_STORAGE_SCOPE === "preview" ? "preview" : "production";
  const blob = await get(`${venue.id}/${scope}/cms/${name}.json`, {
    access: "private",
    token: venueToken(venue),
    useCache: false,
  });
  if (!blob) return [];
  if (blob.statusCode !== 200) {
    throw new Error(`Could not read ${venue.name} ${name} records.`);
  }
  const value = (await new Response(blob.stream).json()) as T[];
  return Array.isArray(value) ? value : [];
}

function withinDays(iso: string, days: number) {
  return Date.parse(iso) >= Date.now() - days * 86400000;
}

export type VenueAnalytics = {
  venue: CollectiveVenue;
  available: boolean;
  subscribers: { total: number; last30: number };
  contacts: { total: number; last30: number };
  clicks: { total: number; last30: number; topTargets: { target: string; count: number }[] };
};

export async function getVenueAnalytics(venue: CollectiveVenue): Promise<VenueAnalytics> {
  try {
    const [subscribers, contacts, clicks] = await Promise.all([
      readVenueRecords<VenueSubscriber>(venue, "subscribers"),
      readVenueRecords<VenueContact>(venue, "contacts"),
      readVenueRecords<VenueMenuClick>(venue, "menu-clicks"),
    ]);
    const counts = new Map<string, number>();
    for (const click of clicks) {
      counts.set(click.target, (counts.get(click.target) ?? 0) + 1);
    }
    const topTargets = [...counts.entries()]
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return {
      venue,
      available: true,
      subscribers: {
        total: subscribers.length,
        last30: subscribers.filter((r) => withinDays(r.createdAt, 30)).length,
      },
      contacts: {
        total: contacts.length,
        last30: contacts.filter((r) => withinDays(r.createdAt, 30)).length,
      },
      clicks: {
        total: clicks.length,
        last30: clicks.filter((r) => withinDays(r.createdAt, 30)).length,
        topTargets,
      },
    };
  } catch {
    return {
      venue,
      available: false,
      subscribers: { total: 0, last30: 0 },
      contacts: { total: 0, last30: 0 },
      clicks: { total: 0, last30: 0, topTargets: [] },
    };
  }
}

export function getAllVenueAnalytics() {
  return Promise.all(COLLECTIVE_VENUES.map((venue) => getVenueAnalytics(venue)));
}
