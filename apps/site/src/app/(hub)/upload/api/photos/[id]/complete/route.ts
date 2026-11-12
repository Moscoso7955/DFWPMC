import { getContributorSession } from "@/lib/contributorAuth";
import { confirmPhotoUploaded, getPendingPhoto, photoKey } from "@/lib/photoStore";
import { headObject } from "@/lib/r2";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const contributor = await getContributorSession();
  if (!contributor) return Response.json({ error: "Please log in again." }, { status: 401 });

  const { id } = await params;
  const photo = await getPendingPhoto(id, contributor.id);
  if (!photo) return Response.json({ error: "Photo not found." }, { status: 404 });

  // Only count the photo once all three copies are really in storage.
  const sizes = await Promise.all((["full", "view", "thumb"] as const).map((size) => headObject(photoKey(photo.date, photo.id, size))));
  if (sizes.some((bytes) => !bytes)) {
    return Response.json({ error: "Upload didn't finish. Try again." }, { status: 409 });
  }

  await confirmPhotoUploaded(photo.id, photo.nightId, sizes[0]!, photo.published);
  return Response.json({ ok: true });
}
