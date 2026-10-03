import { venuePath } from "@/lib/venue";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, "", { maxAge: 0, path: venuePath("/admin") });
    return response;
}
