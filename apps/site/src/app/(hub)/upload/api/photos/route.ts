import { getContributorSession } from "@/lib/contributorAuth";
import { addPendingPhoto, photoKey } from "@/lib/photoStore";
import { isPhotoStorageConfigured, presignUpload } from "@/lib/r2";

export async function POST(request: Request) {
  const contributor = await getContributorSession();
  if (!contributor) return Response.json({ error: "Please log in again." }, { status: 401 });
  if (!isPhotoStorageConfigured()) {
    return Response.json({ error: "Photo storage isn't set up yet. Ask the Public Market." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { nightId?: unknown; name?: unknown; width?: unknown; height?: unknown };
  const width = Number(body.width);
  const height = Number(body.height);
  if (typeof body.nightId !== "string" || typeof body.name !== "string" || !(width > 0 && width <= 10000) || !(height > 0 && height <= 10000)) {
    return Response.json({ error: "Invalid photo." }, { status: 400 });
  }

  const photo = await addPendingPhoto({
    nightId: body.nightId,
    contributorId: contributor.id,
    originalName: body.name,
    width: Math.round(width),
    height: Math.round(height),
  });
  if (!photo) return Response.json({ error: "That night is full or no longer exists." }, { status: 409 });

  const [full, view, thumb] = await Promise.all(
    (["full", "view", "thumb"] as const).map((size) => presignUpload(photoKey(photo.date, photo.id, size))),
  );
  return Response.json({
    id: photo.id,
    uploads: { full, view, thumb },
    downloadName: `public-market-${photo.date}-${photo.id.slice(0, 8)}.jpg`,
  });
}
