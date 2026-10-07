import { NextRequest, NextResponse } from "next/server";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import { getSection, getSectionField } from "@/lib/collective/sections";
import { updateDraftField } from "@/lib/collective/content";
import type { SiteContent } from "@/lib/collective/schema";

export const runtime = "nodejs";

const MAX_LENGTH: Record<string, number> = {
  text: 500,
  textarea: 10000,
  embed: 10000,
  image: 600,
};

export async function PATCH(request: NextRequest) {
  if (!(await hasCollectiveSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { venue?: unknown; section?: unknown; field?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const venue = typeof body.venue === "string" ? getCollectiveVenue(body.venue) : undefined;
  const section = typeof body.section === "string" ? getSection(body.section) : undefined;
  const field =
    section && typeof body.field === "string" ? getSectionField(section, body.field) : undefined;
  if (!venue || !section || !field) {
    return NextResponse.json({ error: "Unknown venue, section, or field." }, { status: 400 });
  }

  if (typeof body.value !== "string") {
    return NextResponse.json({ error: "The value must be text." }, { status: 400 });
  }
  const value = field.kind === "text" ? body.value.trim() : body.value;
  if (value.length > MAX_LENGTH[field.kind]) {
    return NextResponse.json({ error: "That value is too long." }, { status: 400 });
  }
  if (field.kind === "image" && value && !/^(\/|https:\/\/)/.test(value)) {
    return NextResponse.json({ error: "Image values must be uploaded files." }, { status: 400 });
  }

  try {
    await updateDraftField(venue, section.contentKey as keyof SiteContent, field.name, value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The change could not be saved.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
