import type { Metadata } from "next";
import AdminBrandSelector from "@/features/admin-entry/AdminBrandSelector";
import CollectiveOverview from "@/features/admin-entry/CollectiveOverview";
import { requireAdminSession } from "@/lib/requireAdmin";

export const metadata: Metadata = {
  title: "Admin Portal — The Public Market",
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdminSession();
  return <AdminBrandSelector overview={<CollectiveOverview />} />;
}
