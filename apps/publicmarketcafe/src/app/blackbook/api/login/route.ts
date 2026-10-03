import { venueRequestUrl, venuePath } from "@/lib/venue";
import { BLACKBOOK_SESSION_COOKIE, blackbookCookieOptions, classifyBlackbookPassword, createBlackbookSessionValue, } from "@/lib/blackbookAuth";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
    const formData = await request.formData();
    const password = String(formData.get("password") || "");
    const role = classifyBlackbookPassword(password);
    if (!role) {
        return NextResponse.redirect(new URL(venuePath("/blackbook/login?error=1"), venueRequestUrl(request)), 303);
    }
    const response = NextResponse.redirect(new URL(venuePath("/blackbook"), venueRequestUrl(request)), 303);
    response.cookies.set(BLACKBOOK_SESSION_COOKIE, createBlackbookSessionValue(role), blackbookCookieOptions);
    return response;
}
