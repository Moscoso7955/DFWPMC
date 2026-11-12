import { ensureDevice, requestIp } from "@/lib/deviceToken";
import { startEntry } from "@/lib/contestStore";
import { isPhotoStorageConfigured, presignUpload } from "@/lib/r2";
import { photoKey } from "@/lib/photoShared";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!isPhotoStorageConfigured()) {
    return Response.json({ error: "Photo uploads aren't switched on. Ask the bar." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = clean(body.name, 40);
  const costume = clean(body.costume, 60);
  const width = Number(body.width);
  const height = Number(body.height);
  if (typeof body.contestId !== "string") return Response.json({ error: "This contest isn't running." }, { status: 400 });
  if (!name) return Response.json({ error: "Add your name." }, { status: 400 });
  if (body.consent !== true) return Response.json({ error: "Tick the box to say the photo is OK to show." }, { status: 400 });
  if (!(width > 0 && width <= 10000) || !(height > 0 && height <= 10000)) {
    return Response.json({ error: "That photo didn't work. Try another." }, { status: 400 });
  }

  const device = await ensureDevice(body.device);
  const result = await startEntry({
    contestId: body.contestId,
    deviceId: device.id,
    ip: requestIp(request),
    name,
    costume,
    width: Math.round(width),
    height: Math.round(height),
  });
  if (!result.ok) return Response.json({ error: result.error, device: device.token }, { status: result.status });

  const { entry } = result;
  const [full, view, thumb] = await Promise.all(
    (["full", "view", "thumb"] as const).map((size) => presignUpload(photoKey(entry.date, entry.id, size))),
  );
  return Response.json({
    id: entry.id,
    number: entry.number,
    device: device.token,
    uploads: { full, view, thumb },
    downloadName: `public-market-${entry.date}-${entry.id.slice(0, 8)}.jpg`,
  });
}
