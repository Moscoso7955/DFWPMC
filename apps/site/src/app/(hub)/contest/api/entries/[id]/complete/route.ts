import { currentDevice } from "@/lib/deviceToken";
import { finishEntry, getUploadingEntry } from "@/lib/contestStore";
import { checkContestPhoto } from "@/lib/contestCheck";
import { photoKey } from "@/lib/photoShared";
import { headObject, publicPhotoUrl } from "@/lib/r2";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { device?: unknown };
  const device = await currentDevice(body.device);
  if (!device) return Response.json({ error: "Start your entry again." }, { status: 401 });

  const entry = await getUploadingEntry(id, device.id);
  if (!entry) return Response.json({ error: "Entry not found. Start again." }, { status: 404 });
  if (entry.expired) return Response.json({ error: "Entries are closed." }, { status: 409 });

  // Only count the entry once all three copies are really in storage.
  const sizes = await Promise.all((["full", "view", "thumb"] as const).map((size) => headObject(photoKey(entry.date, entry.id, size))));
  if (sizes.some((bytes) => !bytes)) return Response.json({ error: "Upload didn't finish. Try again." }, { status: 409 });

  const verdict =
    entry.moderation === "manual"
      ? ({ allow: false, reason: "Waiting for staff approval" } as const)
      : // The 2048px copy, so small details (a nipple through mesh) are visible.
        await checkContestPhoto(publicPhotoUrl(photoKey(entry.date, entry.id, "view")), { name: entry.name, costume: entry.costume });
  await finishEntry(entry.id, verdict.allow ? "live" : "held", verdict.allow ? null : verdict.reason);
  return Response.json({ ok: true, number: entry.number, status: verdict.allow ? "live" : "held" });
}
