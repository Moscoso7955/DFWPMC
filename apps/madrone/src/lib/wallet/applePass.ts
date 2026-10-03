import forge from "node-forge";
import { PKPass } from "passkit-generator";
import { getSiteUrl } from "@/lib/stripe";
import type { TicketPassData } from "@/lib/ticketingStore";
import { APPLE_PASS_IMAGES } from "./applePassAssets";

const VENUE_ADDRESS = "Venue address to be added";
const VENUE_SHORT = "Venue address to be added";
const TZ = "America/Chicago";

type SigningMaterial = {
  wwdr: string;
  signerCert: string;
  signerKey: string;
};

let cachedCerts: SigningMaterial | null = null;

function wwdrToPem(base64: string): string {
  const decoded = Buffer.from(base64.trim(), "base64");
  const asText = decoded.toString("utf8");
  if (asText.includes("BEGIN CERTIFICATE")) return asText;
  // Accept the raw .cer (DER) too, in case it was encoded before
  // conversion to PEM.
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(decoded.toString("binary")));
  return forge.pki.certificateToPem(forge.pki.certificateFromAsn1(asn1));
}

// The Keychain export is a PKCS#12 bundle; passkit-generator wants the
// signer cert and key as separate PEMs, so split it once per instance.
function loadSigningMaterial(): SigningMaterial {
  if (cachedCerts) return cachedCerts;

  const p12Base64 = (process.env.APPLE_PASS_P12_BASE64 ?? "").replace(/\s+/g, "");
  const password = process.env.APPLE_PASS_P12_PASSWORD ?? "";
  const p12Der = forge.util.decode64(p12Base64);
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
  ];

  const passTypeId = process.env.APPLE_PASS_TYPE_ID ?? "";
  const certs = certBags.map((bag) => bag.cert).filter((c): c is forge.pki.Certificate => Boolean(c));
  const signer =
    certs.find((c) => c.subject.attributes.some((a) => a.value === passTypeId)) ?? certs[0];
  const key = keyBags.map((bag) => bag.key).find(Boolean);

  if (!signer || !key) {
    throw new Error("APPLE_PASS_P12_BASE64 does not contain both a certificate and a private key");
  }

  cachedCerts = {
    wwdr: wwdrToPem(process.env.APPLE_WWDR_CERT_BASE64 ?? ""),
    signerCert: forge.pki.certificateToPem(signer),
    signerKey: forge.pki.privateKeyToPem(key as forge.pki.PrivateKey),
  };
  return cachedCerts;
}

function fmt(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: TZ, ...options });
}

const AGE_LABEL: Record<TicketPassData["eventAgeRestriction"], string> = {
  "21+": "21+ · ID required",
  "18+": "18+ · ID required",
  all_ages: "All ages",
};

function createApplePass(ticket: TicketPassData): PKPass {
  const siteUrl = getSiteUrl();
  const time = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true });
  const shortId = ticket.token.slice(0, 8).toUpperCase();

  const secondaryFields = [
    { key: "date", label: "DATE", value: fmt(ticket.eventStartsAt, { weekday: "short", month: "short", day: "numeric" }) },
    ...(ticket.eventDoorsAt ? [{ key: "doors", label: "DOORS", value: time(ticket.eventDoorsAt) }] : []),
    { key: "starts", label: "STARTS", value: time(ticket.eventStartsAt), textAlignment: "PKTextAlignmentRight" },
  ];

  const auxiliaryFields = [
    { key: "tier", label: "TICKET", value: ticket.tierName, row: 0 as const },
    {
      key: "entry",
      label: "ENTRY",
      value: AGE_LABEL[ticket.eventAgeRestriction],
      textAlignment: "PKTextAlignmentRight",
      row: 0 as const,
    },
    { key: "where", label: "WHERE", value: VENUE_SHORT, row: 1 as const },
    ...(ticket.holderName ? [{ key: "holder", label: "HOLDER", value: ticket.holderName, row: 1 as const }] : []),
  ];

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
    teamIdentifier: process.env.APPLE_TEAM_ID,
    serialNumber: ticket.token,
    organizationName: "Madrone",
    // Shown as the Add-to-Wallet sheet title, which truncates fast.
    description: ticket.eventTitle,
    backgroundColor: "rgb(116, 4, 6)",
    foregroundColor: "rgb(242, 241, 235)",
    labelColor: "rgb(235, 224, 177)",
    sharingProhibited: false,
    voided: ticket.status === "void",
    eventTicket: {
      primaryFields: [{ key: "event", label: "EVENT", value: ticket.eventTitle }],
      secondaryFields,
      auxiliaryFields,
      backFields: [
        { key: "when", label: "When", value: `${fmt(ticket.eventStartsAt, { dateStyle: "full" })} · Starts ${time(ticket.eventStartsAt)}` },
        { key: "address", label: "Where", value: `Madrone\n${VENUE_ADDRESS}` },
        { key: "ticket", label: "Ticket #", value: shortId },
        { key: "view", label: "View ticket", value: `${siteUrl}/t/${ticket.token}` },
        { key: "event-page", label: "Event details", value: `${siteUrl}/calendar/${ticket.eventSlug}` },
        { key: "support", label: "Questions", value: "venue-contact@example.invalid" },
        { key: "terms", label: "Terms", value: `Venue ticketing terms to be added. ${siteUrl}/terms` },
      ],
    },
    // Same payload as the emailed QR so the door scanner accepts both.
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: `${siteUrl}/t/${ticket.token}`,
        messageEncoding: "iso-8859-1",
        altText: `#${shortId}`,
      },
    ],
  };

  const buffers: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(passJson)) };
  for (const [name, base64] of Object.entries(APPLE_PASS_IMAGES)) {
    buffers[name] = Buffer.from(base64, "base64");
  }

  const certs = loadSigningMaterial();
  const pass = new PKPass(buffers, {
    wwdr: certs.wwdr,
    signerCert: certs.signerCert,
    signerKey: certs.signerKey,
  });

  // Surfaces the pass on the lock screen around doors time and greys it
  // out once the night is over.
  pass.setRelevantDate(new Date(ticket.eventDoorsAt ?? ticket.eventStartsAt));
  const endsAt = ticket.eventEndsAt
    ? new Date(ticket.eventEndsAt)
    : new Date(new Date(ticket.eventStartsAt).getTime() + 12 * 60 * 60 * 1000);
  pass.setExpirationDate(endsAt);

  return pass;
}

export function buildApplePass(ticket: TicketPassData): Buffer {
  return createApplePass(ticket).getAsBuffer();
}

// One ticket → a plain .pkpass (works on every iOS). Several → a
// .pkpasses bundle so the buyer adds the whole order in one tap
// (iOS 15+).
export function buildAppleOrderPasses(tickets: TicketPassData[]): {
  body: Buffer;
  contentType: string;
  extension: "pkpass" | "pkpasses";
} {
  if (tickets.length === 1) {
    return { body: buildApplePass(tickets[0]), contentType: "application/vnd.apple.pkpass", extension: "pkpass" };
  }
  const bundle = PKPass.pack(...tickets.map(createApplePass));
  return { body: bundle.getAsBuffer(), contentType: "application/vnd.apple.pkpasses", extension: "pkpasses" };
}
