import { venue } from "./venue";
import snapshot from "../../SOURCE_SNAPSHOT.json";
import pkg from "../../package.json";

// Renders a small "build info" badge at the bottom of authenticated
// shells (admin + ticketing portal). The primary identity is the
// semver from package.json — bumped manually as features ship. The
// short git sha and environment tag are secondary, useful when a
// bug report needs to be tied to an exact commit.

export type AppVersion = {
  version: string;
  sha: string;
  env: string;
  ref: string | null;
};

export function getAppVersion(): AppVersion {
  const fullSha = venue.localPreview ? snapshot.commit : process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  const sha = fullSha ? fullSha.slice(0, 7) : "local";
  const env = venue.localPreview ? "local" : process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const ref = process.env.VERCEL_GIT_COMMIT_REF ?? null;
  const version = (pkg as { version?: string }).version ?? "0.0.0";
  return { version, sha, env, ref };
}

export function formatVersionLabel(version: AppVersion): string {
  const envShort =
    version.env === "local" ? "local preview" : version.env === "production" ? "prod" : version.env === "preview" ? "preview" : "dev";
  return `v${version.version} · ${version.sha} · ${envShort}`;
}
