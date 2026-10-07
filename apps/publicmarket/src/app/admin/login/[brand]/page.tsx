import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminBrandLogin from "@/features/admin-entry/AdminBrandLogin";
import { getBrand } from "@/brands";
import { hasCollectiveSession } from "@/lib/collective/auth";

export const metadata: Metadata = {
  title: "Admin Login — The Public Market",
};

export const dynamic = "force-dynamic";

// The venue apps send signed-out admins here (venue.config entryLoginPath).
// A collective session skips the password and re-enters the portal.
export default async function BrandLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { brand: brandSlug } = await params;
  const brand = getBrand(brandSlug);
  if (!brand) notFound();
  if (await hasCollectiveSession()) redirect(`/admin/enter/${brand.slug}`);
  const { error } = await searchParams;
  return <AdminBrandLogin brand={brand} loginError={Boolean(error)} />;
}
