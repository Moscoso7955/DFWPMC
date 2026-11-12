"use client";

import { makeCopies, putFile } from "@/lib/photoClient";

// Small helpers the Playbook screens share.

export async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const PHOTO_SIZES = { full: 3000, view: 2048, thumb: 800 };

/** Uploads one photo for a play in three sizes; returns its storage key. */
export async function uploadPlayPhoto(playId: string, file: File): Promise<string> {
  const copies = await makeCopies(file, PHOTO_SIZES).catch(() => {
    throw new Error("Couldn't read that photo. Try another.");
  });
  const { key, uploads } = await api<{ key: string; uploads: Record<"full" | "view" | "thumb", string> }>(
    "POST",
    `/admin/api/playbook/plays/${playId}/upload`,
    {},
  );
  const cache = "public, max-age=31536000, immutable";
  await Promise.all(
    (["full", "view", "thumb"] as const).map((size) =>
      putFile(uploads[size], copies.blobs[size], { "Content-Type": "image/jpeg", "Cache-Control": cache }, () => {}),
    ),
  );
  return key;
}

export const dollars = (cents: number | null) => (cents == null ? "" : String(cents / 100));
