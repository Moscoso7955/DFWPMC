import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { can, currentArea, getPrincipal, homeFor, PATH_HEADER } from "./session";

/**
 * For admin pages: signed out goes to sign-in (and back here after);
 * signed in without access to this area goes to the first page they can
 * use, or to a "no access yet" page.
 */
export async function requireAdminSession() {
  const area = await currentArea();
  if (await can(area)) return;
  const principal = await getPrincipal();
  if (!principal) {
    const path = (await headers()).get(PATH_HEADER) ?? "/admin";
    redirect(`/admin/login?next=${encodeURIComponent(path)}`);
  }
  redirect((await homeFor(principal)) ?? "/admin/no-access");
}
