import { getVenue, siteRequestUrl } from "@/lib/venues";
import { blackbookCookieOptions, blackbookSessionCookie, classifyBlackbookPassword, createBlackbookSessionValue } from "@/lib/blackbookAuth";
import { NextResponse } from "next/server";
export async function POST(request: Request, { params }: { params: Promise<{ venue: string }> }) {
    const venue = getVenue((await params).venue);
    const formData = await request.formData();
    const password = String(formData.get("password") || "");
    const role = classifyBlackbookPassword(password);
    if (!role) {
        return NextResponse.redirect(new URL(`${venue.basePath}/blackbook/login?error=1`, siteRequestUrl(request)), 303);
    }
    const response = NextResponse.redirect(new URL(`${venue.basePath}/blackbook`, siteRequestUrl(request)), 303);
    response.cookies.set(blackbookSessionCookie(venue), createBlackbookSessionValue(role), blackbookCookieOptions(venue));
    return response;
}
