import { getVenue } from "@/lib/venues";
import { blackbookSessionCookie } from "@/lib/blackbookAuth";
import { NextResponse } from "next/server";
export async function POST(_request: Request, { params }: { params: Promise<{ venue: string }> }) {
    const venue = getVenue((await params).venue);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(blackbookSessionCookie(venue), "", { maxAge: 0, path: `${venue.basePath}/blackbook` });
    return response;
}
