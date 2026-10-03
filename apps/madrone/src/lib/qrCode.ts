import QRCode from "qrcode";

// High error-correction so a smudged phone screen at the door still
// scans. 512x512 gives crisp results on both email + confirmation
// page renders, and both the PNG buffer and base64 data URI variants
// are used by different callers.

export async function generateTicketQrPng(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: "H",
    margin: 1,
    scale: 8,
    color: { dark: "#222020", light: "#f2f1eb" },
  });
}

export async function generateTicketQrDataUri(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 1,
    scale: 8,
    color: { dark: "#222020", light: "#f2f1eb" },
  });
}
