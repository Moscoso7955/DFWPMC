import { hasAdminSession } from "@/lib/adminAuth";
import { getPrincipal } from "@/lib/session";

/** People & access APIs: allowed, plus who's doing it (for invite emails). */
export async function accessActor(): Promise<string | null> {
  if (!(await hasAdminSession())) return null;
  const principal = await getPrincipal();
  return principal?.kind === "user" ? principal.user.name.split(/\s+/)[0] || principal.user.name : "The Admin";
}
