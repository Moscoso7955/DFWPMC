import type { EventInput, TierInput } from "@/lib/ticketingStore";
import type { AgeRestriction, EventStatus } from "@/lib/ticketingTypes";
import { spotifyTrackId } from "./songPreview";

const AGE_VALUES: AgeRestriction[] = ["21+", "18+", "all_ages"];
const STATUS_VALUES: EventStatus[] = ["draft", "published", "cancelled", "past"];

export function parseEventInput(body: Record<string, unknown>): EventInput | { error: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";

  if (title.length < 1) return { error: "Title is required." };
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) return { error: "A valid start time is required." };

  const ageRaw = body.ageRestriction;
  const ageRestriction = (AGE_VALUES as string[]).includes(ageRaw as string)
    ? (ageRaw as AgeRestriction)
    : "21+";

  const statusRaw = body.status;
  const status = (STATUS_VALUES as string[]).includes(statusRaw as string)
    ? (statusRaw as EventStatus)
    : "draft";

  const capacityRaw = body.capacity;
  const capacity =
    capacityRaw === null || capacityRaw === undefined || capacityRaw === ""
      ? null
      : Number.isFinite(Number(capacityRaw)) && Number(capacityRaw) >= 0
      ? Math.floor(Number(capacityRaw))
      : null;

  const songRaw = typeof body.songUrl === "string" ? body.songUrl.trim() : "";
  let songUrl: string | null = null;
  if (songRaw) {
    const trackId = spotifyTrackId(songRaw);
    if (!trackId) return { error: "Song must be a Spotify track link (open.spotify.com/track/…)." };
    songUrl = `https://open.spotify.com/track/${trackId}`;
  }

  return {
    slug: typeof body.slug === "string" ? body.slug.trim() || null : null,
    title,
    songUrl,
    descriptionMd: typeof body.descriptionMd === "string" ? body.descriptionMd : null,
    imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    startsAt,
    endsAt: typeof body.endsAt === "string" && body.endsAt ? body.endsAt : null,
    doorsAt: typeof body.doorsAt === "string" && body.doorsAt ? body.doorsAt : null,
    ageRestriction,
    capacity,
    status,
  };
}

export function parseTierInput(body: Record<string, unknown>): TierInput | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1) return { error: "Tier name is required." };

  const priceCents = Number(body.priceCents);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { error: "Price must be a non-negative integer number of cents." };
  }

  const admitsPerTicket = Math.max(1, Math.floor(Number(body.admitsPerTicket ?? 1)));
  const quantity = Math.max(0, Math.floor(Number(body.quantity ?? 0)));
  const maxPerOrder = Math.max(1, Math.floor(Number(body.maxPerOrder ?? 10)));
  const sortOrder = Math.floor(Number(body.sortOrder ?? 0)) || 0;
  const isHidden = Boolean(body.isHidden);

  return {
    name,
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    priceCents: Math.floor(priceCents),
    admitsPerTicket,
    quantity,
    maxPerOrder,
    salesStartAt: typeof body.salesStartAt === "string" && body.salesStartAt ? body.salesStartAt : null,
    salesEndAt: typeof body.salesEndAt === "string" && body.salesEndAt ? body.salesEndAt : null,
    sortOrder,
    isHidden,
  };
}
