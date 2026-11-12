import { currentDevice, ensureDevice } from "@/lib/deviceToken";
import { getMyEntry, getMyVotes } from "@/lib/contestStore";

// The page asks on load, with the id it kept in storage, so a phone whose
// cookie was cleared still shows (and keeps) its entry and vote.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { contestId?: unknown; device?: unknown };
  const known = await currentDevice(body.device);
  if (!known || typeof body.contestId !== "string") return Response.json({ entry: null, votes: {}, device: known?.token ?? null });
  const device = await ensureDevice(known.token);
  const [entry, votes] = await Promise.all([getMyEntry(body.contestId, device.id), getMyVotes(body.contestId, device.id)]);
  return Response.json({ entry, votes, device: device.token });
}
