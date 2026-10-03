import { venue } from "../venue";
export function isGoogleWalletConfigured(): boolean {
  if (venue.localPreview) return false;

  return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON);
}

export function isAppleWalletConfigured(): boolean {
  if (venue.localPreview) return false;

  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_PASS_P12_BASE64 &&
      process.env.APPLE_WWDR_CERT_BASE64,
  );
}
