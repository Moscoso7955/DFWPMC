import { randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/adminAuth";
import {
  addDraftCalendarEvent,
  deleteDraftCalendarEvent,
  isCalendarContentField,
  moveDraftCalendarEvent,
  updateDraftCalendarField,
} from "@/lib/siteContent";
import type { CalendarEventContent } from "@/lib/siteContentSchema";

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeOptionalUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  try {
    return new URL(trimmedValue).toString();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { field?: unknown; value?: unknown };

  if (!isCalendarContentField(body.field) || typeof body.value !== "string") {
    return Response.json({ error: "Invalid calendar draft update" }, { status: 400 });
  }

  const value = body.value.trim();

  if (value.length < 1) {
    return Response.json({ error: "Invalid calendar title" }, { status: 400 });
  }

  const content = await updateDraftCalendarField(body.field, value);
  return Response.json({ ok: true, content });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    date?: unknown;
    title?: unknown;
    time?: unknown;
    description?: unknown;
    url?: unknown;
  };

  if (
    typeof body.date !== "string" ||
    typeof body.title !== "string" ||
    typeof body.time !== "string" ||
    typeof body.description !== "string"
  ) {
    return Response.json({ error: "Invalid calendar event" }, { status: 400 });
  }

  const date = body.date.trim();
  const title = body.title.trim();
  const time = body.time.trim();
  const description = body.description.trim();
  const url = typeof body.url === "string" ? normalizeOptionalUrl(body.url) : undefined;

  if (!isValidDate(date) || !title || !time || !description || url === null) {
    return Response.json({ error: "Invalid calendar event" }, { status: 400 });
  }

  const event: CalendarEventContent = {
    id: randomUUID(),
    date,
    title,
    time,
    description,
    ...(url ? { url } : {}),
  };

  const content = await addDraftCalendarEvent(event);
  return Response.json({ ok: true, content });
}

export async function PUT(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: unknown; date?: unknown; time?: unknown };

  if (typeof body.id !== "string" || typeof body.date !== "string" || typeof body.time !== "string") {
    return Response.json({ error: "Invalid calendar event move" }, { status: 400 });
  }

  const id = body.id.trim();
  const date = body.date.trim();
  const time = body.time.trim();

  if (!id || !isValidDate(date) || !time) {
    return Response.json({ error: "Invalid calendar event move" }, { status: 400 });
  }

  const content = await moveDraftCalendarEvent(id, date, time);
  return Response.json({ ok: true, content });
}

export async function DELETE(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: unknown };

  if (typeof body.id !== "string" || body.id.trim().length < 1) {
    return Response.json({ error: "Invalid calendar event" }, { status: 400 });
  }

  const content = await deleteDraftCalendarEvent(body.id);
  return Response.json({ ok: true, content });
}
