// Blackbook access rides the one collective sign-in: the "door" area is
// view access, the "blackbook" area is edit access (see accessShared.ts).
// The legacy shared admin password counts as Admin, so it covers both
// until Google sign-in takes over.
import { can } from "./session";

export type BlackbookRole = "admin" | "viewer";

export async function getBlackbookRole(): Promise<BlackbookRole | null> {
    if (await can("blackbook"))
        return "admin";
    if (await can("door"))
        return "viewer";
    return null;
}

export async function hasBlackbookSession() {
    return (await getBlackbookRole()) !== null;
}

export async function hasBlackbookAdminSession() {
    return (await getBlackbookRole()) === "admin";
}
