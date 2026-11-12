import QRCode from "qrcode";
import { hasAdminSession } from "@/lib/adminAuth";

// The printable QR for barphoebe.com/contest. One code for every photo
// event: the page always shows whichever one is on.
export async function GET(request: Request) {
  if (!(await hasAdminSession())) return new Response("Unauthorized", { status: 401 });
  const origin = new URL(request.url).origin.replace("://www.", "://");
  const png = await QRCode.toBuffer(`${origin}/contest`, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 16,
    color: { dark: "#222020", light: "#ffffff" },
  });
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      ...(download ? { "Content-Disposition": 'attachment; filename="bar-phoebe-contest-qr.png"' } : {}),
    },
  });
}
