import { venuePath } from "@/lib/venue";
import { createHash, createSign } from "node:crypto";
import { getSiteUrl } from "@/lib/stripe";
import type { TicketPassData } from "@/lib/ticketingStore";
const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const TZ = "America/Chicago";
const RED = "#740406";
type ServiceAccount = {
    client_email: string;
    private_key: string;
};
let cachedAccount: ServiceAccount | null = null;
let cachedToken: {
    value: string;
    expiresAt: number;
} | null = null;
function serviceAccount(): ServiceAccount {
    if (cachedAccount)
        return cachedAccount;
    const raw = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON ?? "{}") as Partial<ServiceAccount>;
    if (!raw.client_email || !raw.private_key) {
        throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
    }
    // Pasting JSON into some env UIs double-escapes the key's newlines.
    cachedAccount = { client_email: raw.client_email, private_key: raw.private_key.replace(/\\n/g, "\n") };
    return cachedAccount;
}
function issuerId(): string {
    return (process.env.GOOGLE_WALLET_ISSUER_ID ?? "").trim();
}
function base64url(input: string | Buffer): string {
    return Buffer.from(input).toString("base64url");
}
function signJwt(claims: Record<string, unknown>): string {
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const body = base64url(JSON.stringify(claims));
    const signature = createSign("RSA-SHA256").update(`${header}.${body}`).sign(serviceAccount().private_key);
    return `${header}.${body}.${base64url(signature)}`;
}
async function accessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000)
        return cachedToken.value;
    const now = Math.floor(Date.now() / 1000);
    const assertion = signJwt({
        iss: serviceAccount().client_email,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
    });
    const response = await fetch(venuePath(TOKEN_URL), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    });
    if (!response.ok)
        throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };
    cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
}
async function walletRequest(method: "POST" | "PUT", path: string, body: unknown): Promise<Response> {
    return fetch(venuePath(`${WALLET_API}${path}`), {
        method,
        headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
// Wallet shows DateTimes in the offset they're given, so send Chicago
// wall time with its offset (e.g. 2026-10-23T20:00:00-05:00).
function chicagoIso(iso: string): string {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        timeZoneName: "longOffset",
    })
        .formatToParts(new Date(iso))
        .map((p) => [p.type, p.value]));
    const offset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName.replace("GMT", "");
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}
function endsAtIso(ticket: TicketPassData): string {
    return ticket.eventEndsAt ?? new Date(new Date(ticket.eventStartsAt).getTime() + 12 * 60 * 60 * 1000).toISOString();
}
// Class data (name, times) is baked into the id via a short hash, so
// editing an event yields a fresh class instead of silently leaving
// new passes on stale details. Already-saved passes keep the old one.
function classIdFor(ticket: TicketPassData): string {
    const hash = createHash("sha256")
        .update([ticket.eventTitle, ticket.eventStartsAt, ticket.eventDoorsAt ?? "", ticket.eventEndsAt ?? ""].join("|"))
        .digest("hex")
        .slice(0, 10);
    return `${issuerId()}.ev_${ticket.eventId.replace(/-/g, "")}_${hash}`;
}
function eventClass(ticket: TicketPassData, siteUrl: string) {
    const text = (value: string) => ({ defaultValue: { language: "en-US", value } });
    return {
        id: classIdFor(ticket),
        issuerName: "Public Market Cafe & Goods",
        reviewStatus: "UNDER_REVIEW",
        eventName: text(ticket.eventTitle),
        logo: {
            sourceUri: { uri: `${siteUrl}/wallet/google-logo.png` },
            contentDescription: text("Public Market Cafe & Goods"),
        },
        venue: {
            name: text("Public Market Cafe & Goods"),
            address: text("Venue address to be added"),
        },
        dateTime: {
            start: chicagoIso(ticket.eventStartsAt),
            end: chicagoIso(endsAtIso(ticket)),
            ...(ticket.eventDoorsAt ? { doorsOpen: chicagoIso(ticket.eventDoorsAt) } : {}),
        },
        hexBackgroundColor: RED,
        homepageUri: { uri: `${siteUrl}/calendar/${ticket.eventSlug}`, description: "Event details" },
    };
}
const AGE_LABEL: Record<TicketPassData["eventAgeRestriction"], string> = {
    "21+": "21+ · valid photo ID required",
    "18+": "18+ · valid photo ID required",
    all_ages: "All ages",
};
function objectIdFor(ticket: TicketPassData): string {
    return `${issuerId()}.tk_${ticket.token}`;
}
function ticketObject(ticket: TicketPassData, siteUrl: string) {
    const shortId = ticket.token.slice(0, 8).toUpperCase();
    return {
        id: objectIdFor(ticket),
        classId: classIdFor(ticket),
        state: ticket.status === "void" ? "INACTIVE" : "ACTIVE",
        // Same payload as the emailed QR and the Apple pass.
        barcode: { type: "QR_CODE", value: `${siteUrl}/t/${ticket.token}`, alternateText: `#${shortId}` },
        ticketNumber: shortId,
        ticketType: { defaultValue: { language: "en-US", value: ticket.tierName } },
        ...(ticket.holderName ? { ticketHolderName: ticket.holderName } : {}),
        hexBackgroundColor: RED,
        validTimeInterval: { end: { date: chicagoIso(endsAtIso(ticket)) } },
        textModulesData: [{ id: "entry", header: "Entry", body: AGE_LABEL[ticket.eventAgeRestriction] }],
        linksModuleData: {
            uris: [
                { id: "ticket", uri: `${siteUrl}/t/${ticket.token}`, description: "View ticket" },
                { id: "terms", uri: `${siteUrl}/terms`, description: "Terms" },
            ],
        },
    };
}
async function ensureClass(ticket: TicketPassData, siteUrl: string): Promise<void> {
    const response = await walletRequest("POST", "/eventTicketClass", eventClass(ticket, siteUrl));
    if (response.ok || response.status === 409)
        return;
    throw new Error(`Google eventTicketClass insert failed: ${response.status} ${await response.text()}`);
}
async function upsertObject(ticket: TicketPassData, siteUrl: string): Promise<void> {
    const body = ticketObject(ticket, siteUrl);
    const inserted = await walletRequest("POST", "/eventTicketObject", body);
    if (inserted.ok)
        return;
    if (inserted.status !== 409) {
        throw new Error(`Google eventTicketObject insert failed: ${inserted.status} ${await inserted.text()}`);
    }
    // Already saved once — refresh it so status changes (e.g. void) land.
    const updated = await walletRequest("PUT", `/eventTicketObject/${encodeURIComponent(body.id)}`, body);
    if (!updated.ok) {
        throw new Error(`Google eventTicketObject update failed: ${updated.status} ${await updated.text()}`);
    }
}
// Creates/refreshes the class and objects via the REST API, then
// returns a short "skinny" save link that just references the ids.
export async function buildGoogleSaveUrl(tickets: TicketPassData[]): Promise<string> {
    if (tickets.length === 0)
        throw new Error("No tickets to save");
    const siteUrl = getSiteUrl();
    const classes = new Map(tickets.map((t) => [classIdFor(t), t]));
    for (const ticket of classes.values())
        await ensureClass(ticket, siteUrl);
    await Promise.all(tickets.map((t) => upsertObject(t, siteUrl)));
    const jwt = signJwt({
        iss: serviceAccount().client_email,
        aud: "google",
        typ: "savetowallet",
        origins: [siteUrl],
        payload: { eventTicketObjects: tickets.map((t) => ({ id: objectIdFor(t) })) },
    });
    return `https://pay.google.com/gp/v/save/${jwt}`;
}
