import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrand } from "@/brands";
import AdminBrandLogin from "@/features/admin-entry/AdminBrandLogin";

type BrandLoginPageProps = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: BrandLoginPageProps): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = getBrand(slug);
  return { title: `${brand?.name ?? "Admin"} Admin Login — The Public Market` };
}

export default async function BrandLoginPage({ params, searchParams }: BrandLoginPageProps) {
  const { brand: slug } = await params;
  const brand = getBrand(slug);
  if (!brand) notFound();

  const query = await searchParams;
  return <AdminBrandLogin brand={brand} loginError={query.error === "password"} />;
}
