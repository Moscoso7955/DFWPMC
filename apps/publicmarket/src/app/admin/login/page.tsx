import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminCollectiveLogin from "@/features/admin-entry/AdminCollectiveLogin";
import { hasCollectiveSession } from "@/lib/collective/auth";

export const metadata: Metadata = {
  title: "Admin Login — The Public Market",
};

export const dynamic = "force-dynamic";

export default async function CollectiveLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasCollectiveSession()) redirect("/admin");
  const { error } = await searchParams;
  return <AdminCollectiveLogin loginError={Boolean(error)} />;
}
