import AdminShell from "../AdminShell";
import { VisitPageView } from "@/app/visit/page";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminVisitPage() {
  await requireAdminSession();
  return (
    <AdminShell>
      <VisitPageView basePath="/admin" />
    </AdminShell>
  );
}
