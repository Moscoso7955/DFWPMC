import { notFound, redirect } from "next/navigation";
import { getBrand } from "@/brands";
import { hasAnySession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// The venue pages send signed-out admins here. There is one login gate for
// the whole collective: with a session this re-enters the venue portal
// directly, otherwise it goes to /admin/login aimed back at that portal.
export default async function BrandLoginRedirect({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const brand = getBrand(brandSlug);
  if (!brand) notFound();
  if (await hasAnySession()) redirect(`/admin/enter/${brand.slug}`);
  redirect(`/admin/login?next=${encodeURIComponent(brand.admin.portalPath)}`);
}
