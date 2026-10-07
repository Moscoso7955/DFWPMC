import { notFound, redirect } from "next/navigation";
import { getBrand } from "@/brands";
import { hasCollectiveSession } from "@/lib/collective/auth";

export const dynamic = "force-dynamic";

// The venue apps send signed-out admins here (venue.config entryLoginPath).
// There is one login gate for the whole collective: with a session this
// re-enters the venue portal directly, otherwise it goes to /admin/login.
export default async function BrandLoginRedirect({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const brand = getBrand(brandSlug);
  if (!brand) notFound();
  if (await hasCollectiveSession()) redirect(`/admin/enter/${brand.slug}`);
  redirect("/admin/login");
}
