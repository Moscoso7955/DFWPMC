import { venuePath } from "@/lib/venue";
import { BLACKBOOK_SESSION_COOKIE } from "@/lib/blackbookAuth";
import { NextResponse } from "next/server";
export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(BLACKBOOK_SESSION_COOKIE, "", { maxAge: 0, path: venuePath("/blackbook") });
    return response;
}
