import type { Metadata } from "next";
import AdminBrandSelector from "@/features/admin-entry/AdminBrandSelector";

export const metadata: Metadata = {
  title: "Admin Portal — The Public Market",
};

export default function AdminHomePage() {
  return <AdminBrandSelector />;
}
