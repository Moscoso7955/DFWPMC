import { ensureDevice } from "@/lib/deviceToken";
import { reportEntry } from "@/lib/contestStore";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { entryId?: unknown; device?: unknown };
  if (typeof body.entryId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.entryId)) {
    return Response.json({ error: "Unknown entry." }, { status: 400 });
  }
  const device = await ensureDevice(body.device);
  const result = await reportEntry(body.entryId, device.id);
  return Response.json({ ok: result.ok, device: device.token });
}
