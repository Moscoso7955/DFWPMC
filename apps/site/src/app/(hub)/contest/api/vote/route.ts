import { ensureDevice, requestIp } from "@/lib/deviceToken";
import { castVote, getContest } from "@/lib/contestStore";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { contestId?: unknown; entryId?: unknown; categoryId?: unknown; device?: unknown };
  if (typeof body.contestId !== "string" || typeof body.entryId !== "string") {
    return Response.json({ error: "Pick a costume to vote for." }, { status: 400 });
  }
  const contest = await getContest(body.contestId);
  if (!contest) return Response.json({ error: "This contest isn't running." }, { status: 404 });
  const device = await ensureDevice(body.device);
  // Older pages (and single-prize events) can leave the prize out.
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : contest.categories[0].id;
  const result = await castVote({ contest, entryId: body.entryId, categoryId, deviceId: device.id, ip: requestIp(request) });
  if (!result.ok) {
    return Response.json({ error: result.error, entryId: result.entryId ?? null, device: device.token }, { status: result.status });
  }
  return Response.json({ ok: true, entryId: result.entryId, device: device.token });
}
