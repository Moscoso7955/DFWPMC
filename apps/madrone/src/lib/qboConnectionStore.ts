import { venue } from "./venue";
import { sql } from "@vercel/postgres";

const USE_DB = !venue.localPreview && Boolean(process.env.POSTGRES_URL);

export type QboConnection = {
  realmId: string;
  environment: "sandbox" | "production";
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  connectedAt: string;
  updatedAt: string;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  // Madrone is single-tenant against its own QBO company, so the
  // table is conceptually a single row keyed by environment. If we
  // ever add a sandbox connection alongside production we can hold
  // both here without any migration.
  schemaReady = (async () => {
    await sql`
      create table if not exists qbo_connections (
        environment text primary key check (environment in ('sandbox', 'production')),
        realm_id text not null,
        access_token text not null,
        access_token_expires_at timestamptz not null,
        refresh_token text not null,
        refresh_token_expires_at timestamptz not null,
        connected_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
  })();
  return schemaReady;
}

function rowToConnection(row: Record<string, unknown>): QboConnection {
  return {
    realmId: row.realm_id as string,
    environment: row.environment as "sandbox" | "production",
    accessToken: row.access_token as string,
    accessTokenExpiresAt: (row.access_token_expires_at as Date).toISOString(),
    refreshToken: row.refresh_token as string,
    refreshTokenExpiresAt: (row.refresh_token_expires_at as Date).toISOString(),
    connectedAt: (row.connected_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export async function getQboConnection(
  environment: "sandbox" | "production",
): Promise<QboConnection | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    select * from qbo_connections where environment = ${environment} limit 1
  `;
  return rows[0] ? rowToConnection(rows[0]) : null;
}

export async function upsertQboConnection(input: {
  environment: "sandbox" | "production";
  realmId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}): Promise<QboConnection> {
  if (!USE_DB) throw new Error("DB unavailable");
  await ensureSchema();
  const { rows } = await sql`
    insert into qbo_connections (
      environment, realm_id,
      access_token, access_token_expires_at,
      refresh_token, refresh_token_expires_at
    ) values (
      ${input.environment}, ${input.realmId},
      ${input.accessToken}, ${input.accessTokenExpiresAt},
      ${input.refreshToken}, ${input.refreshTokenExpiresAt}
    )
    on conflict (environment) do update set
      realm_id = excluded.realm_id,
      access_token = excluded.access_token,
      access_token_expires_at = excluded.access_token_expires_at,
      refresh_token = excluded.refresh_token,
      refresh_token_expires_at = excluded.refresh_token_expires_at,
      updated_at = now()
    returning *
  `;
  return rowToConnection(rows[0]);
}

export async function deleteQboConnection(
  environment: "sandbox" | "production",
): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`delete from qbo_connections where environment = ${environment}`;
}
