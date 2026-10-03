import { adminEntryUrl } from "@/lib/venue";
import { hasAdminSession } from "@/lib/adminAuth";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

// The approved login UI belongs to the Public Market hub.
export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await hasAdminSession()) redirect("/admin");
  const params = await searchParams;
  redirect(adminEntryUrl(params?.error ? "password" : undefined));
}
