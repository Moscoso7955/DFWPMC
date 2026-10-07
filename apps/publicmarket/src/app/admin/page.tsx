import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminBrandSelector from "@/features/admin-entry/AdminBrandSelector";
import { hasCollectiveSession } from "@/lib/collective/auth";

export const metadata: Metadata = {
  title: "Admin Portal — The Public Market",
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!(await hasCollectiveSession())) redirect("/admin/login");
  return <AdminBrandSelector />;
}
