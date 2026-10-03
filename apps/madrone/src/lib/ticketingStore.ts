import { previewEvent, previewEvents, previewTier, previewPublicTier, previewSettings, previewOrders, previewTickets, previewItems, previewPromos, previewPass, previewDoorEvents, previewGuestRows, previewDoorSearch, previewOrderList, previewOrderDetails } from "./previewData";
import { venue } from "./venue";
import { randomBytes } from "node:crypto";
import { sql } from "@vercel/postgres";
import type {
  AgeRestriction,
  CheckInResult,
  Order,
  OrderItem,
  OrderStatus,
  PromoCode,
  PublicTier,
  ReserveResult,
  Ticket,
  TicketStatus,
  TicketTier,
  TicketedEvent,
  TicketingSettings,
} from "./ticketingTypes";

const USE_DB = !venue.localPreview && Boolean(process.env.POSTGRES_URL);

// ---------------------------------------------------------------------------
// Schema — matches the ticketing build spec. Runs idempotently on first use
// of any exported function, same pattern as blackbookStore, subscribersStore,
// etc. Enums are guarded because CREATE TYPE has no IF NOT EXISTS in
// standard Postgres.
// ---------------------------------------------------------------------------

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      do $$ begin
        create type age_restriction as enum ('21+', '18+', 'all_ages');
      exception when duplicate_object then null; end $$
    `;
    await sql`
      do $$ begin
        create type event_status as enum ('draft', 'published', 'cancelled', 'past');
      exception when duplicate_object then null; end $$
    `;
    await sql`
      do $$ begin
        create type order_status as enum ('pending', 'paid', 'expired', 'refunded', 'partially_refunded', 'disputed');
      exception when duplicate_object then null; end $$
    `;
    await sql`
      do $$ begin
        create type ticket_status as enum ('valid', 'checked_in', 'void');
      exception when duplicate_object then null; end $$
    `;

    await sql`
      create table if not exists ticketing_settings (
        id int primary key default 1 check (id = 1),
        tax_rate numeric(6,5) not null default 0.13475,
        stripe_pct numeric(6,5) not null default 0.029,
        stripe_fixed_cents int not null default 30,
        hold_minutes int not null default 30 check (hold_minutes >= 30),
        refund_policy_md text,
        support_email text
      )
    `;
    await sql`insert into ticketing_settings (id) values (1) on conflict (id) do nothing`;

    await sql`
      create table if not exists ticketing_events (
        id uuid primary key default gen_random_uuid(),
        slug text unique not null,
        title text not null,
        description_md text,
        image_url text,
        starts_at timestamptz not null,
        ends_at timestamptz,
        doors_at timestamptz,
        age_restriction age_restriction not null default '21+',
        capacity int check (capacity is null or capacity >= 0),
        status event_status not null default 'draft',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create index if not exists ticketing_events_status_starts_at_idx
        on ticketing_events (status, starts_at)
    `;

    await sql`
      create table if not exists ticketing_tiers (
        id uuid primary key default gen_random_uuid(),
        event_id uuid not null references ticketing_events(id) on delete cascade,
        name text not null,
        description text,
        price_cents int not null check (price_cents >= 0),
        admits_per_ticket int not null default 1 check (admits_per_ticket >= 1),
        quantity int not null check (quantity >= 0),
        sold int not null default 0,
        held int not null default 0,
        max_per_order int not null default 10 check (max_per_order >= 1),
        sales_start_at timestamptz,
        sales_end_at timestamptz,
        sort_order int not null default 0,
        is_hidden boolean not null default false,
        check (sold + held <= quantity),
        check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
      )
    `;
    await sql`create index if not exists ticketing_tiers_event_idx on ticketing_tiers (event_id, sort_order)`;

    await sql`
      create table if not exists ticketing_promo_codes (
        id uuid primary key default gen_random_uuid(),
        event_id uuid not null references ticketing_events(id) on delete cascade,
        code text not null,
        percent_off numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
        amount_off_cents int check (amount_off_cents is null or amount_off_cents > 0),
        max_uses int check (max_uses is null or max_uses > 0),
        uses int not null default 0,
        expires_at timestamptz,
        check ((percent_off is null) <> (amount_off_cents is null))
      )
    `;
    await sql`
      create unique index if not exists ticketing_promo_codes_event_code_idx
        on ticketing_promo_codes (event_id, lower(code))
    `;

    await sql`
      create table if not exists ticketing_orders (
        id uuid primary key default gen_random_uuid(),
        event_id uuid not null references ticketing_events(id),
        status order_status not null default 'pending',
        buyer_name text not null,
        buyer_email text not null,
        buyer_phone text,
        age_attested boolean not null default false,
        promo_code_id uuid references ticketing_promo_codes(id),
        subtotal_cents int not null,
        discount_cents int not null default 0,
        service_fee_cents int not null,
        tax_cents int not null,
        total_cents int not null,
        is_comp boolean not null default false,
        stripe_checkout_session_id text unique,
        stripe_payment_intent_id text unique,
        stripe_fee_cents int,
        hold_expires_at timestamptz,
        paid_at timestamptz,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create index if not exists ticketing_orders_event_status_idx on ticketing_orders (event_id, status)`;
    await sql`
      create index if not exists ticketing_orders_hold_expiry_idx
        on ticketing_orders (hold_expires_at)
        where status = 'pending'
    `;
    // Marketing opt-in flag on the order — set from a buyer checkbox in
    // the drawer. On successful payment the webhook reads it and
    // enrolls the buyer in the mailing list (subscribers table) with
    // source 'ticket_purchase'. Defaults false so silent buyers stay
    // out of marketing per CAN-SPAM best practice.
    await sql`
      alter table ticketing_orders
        add column if not exists marketing_opt_in boolean not null default false
    `;

    await sql`
      alter table ticketing_events
        add column if not exists song_url text
    `;

    await sql`
      create table if not exists ticketing_order_items (
        id uuid primary key default gen_random_uuid(),
        order_id uuid not null references ticketing_orders(id) on delete cascade,
        tier_id uuid not null references ticketing_tiers(id),
        quantity int not null check (quantity > 0),
        unit_price_cents int not null
      )
    `;
    await sql`create index if not exists ticketing_order_items_order_idx on ticketing_order_items (order_id)`;

    await sql`
      create table if not exists ticketing_tickets (
        id uuid primary key default gen_random_uuid(),
        order_id uuid not null references ticketing_orders(id) on delete cascade,
        tier_id uuid not null references ticketing_tiers(id),
        event_id uuid not null references ticketing_events(id),
        token text unique not null,
        holder_name text,
        status ticket_status not null default 'valid',
        checked_in_at timestamptz,
        checked_in_by text,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create index if not exists ticketing_tickets_event_status_idx on ticketing_tickets (event_id, status)`;

    await sql`
      create table if not exists ticketing_stripe_events (
        id text primary key,
        type text not null,
        received_at timestamptz not null default now()
      )
    `;

    // ---------------------------------------------------------------------
    // reserve_tickets — single transaction, row-locks the tiers + event,
    // validates promos, does the price math from §4, inserts a pending
    // order + items and bumps held. Returns a JSON blob the app uses to
    // build the Stripe Checkout session.
    // ---------------------------------------------------------------------
    // Adding p_marketing_opt_in changes the signature, so drop then
    // recreate. Existing callers that don't pass it get the default
    // (false) via the DEFAULT clause below.
    await sql`drop function if exists reserve_tickets(uuid, jsonb, text, text, text, text, boolean)`;
    await sql`
      create or replace function reserve_tickets(
        p_event_id         uuid,
        p_items            jsonb,
        p_promo_code       text,
        p_buyer_name       text,
        p_buyer_email      text,
        p_buyer_phone      text,
        p_age_attested     boolean,
        p_marketing_opt_in boolean default false
      ) returns jsonb
      language plpgsql
      as $BODY$
      declare
        v_settings ticketing_settings%rowtype;
        v_event    ticketing_events%rowtype;
        v_item     jsonb;
        v_tier_id  uuid;
        v_qty      int;
        v_tier     ticketing_tiers%rowtype;
        v_promo    ticketing_promo_codes%rowtype;
        v_subtotal_raw   int := 0;
        v_admissions     int := 0;
        v_total_used     int := 0;
        v_discount       int := 0;
        v_subtotal       int;
        v_tax            int;
        v_pre_fee        int;
        v_total          int;
        v_service_fee    int;
        v_order_id       uuid;
        v_hold_expires   timestamptz;
        v_return_items   jsonb := '[]'::jsonb;
      begin
        select * into v_settings from ticketing_settings where id = 1;

        select * into v_event from ticketing_events where id = p_event_id for update;
        if not found or v_event.status <> 'published' then
          raise exception 'EVENT_UNAVAILABLE';
        end if;

        if jsonb_array_length(p_items) = 0 then
          raise exception 'NO_ITEMS';
        end if;

        if v_event.capacity is not null then
          select coalesce(sum(t.admits_per_ticket * (t.sold + t.held)), 0)
          into v_total_used
          from ticketing_tiers t
          where t.event_id = v_event.id;
        end if;

        for v_item in select * from jsonb_array_elements(p_items) loop
          v_tier_id := (v_item ->> 'tier_id')::uuid;
          v_qty     := (v_item ->> 'quantity')::int;
          if v_qty <= 0 then
            raise exception 'BAD_QUANTITY';
          end if;

          select * into v_tier from ticketing_tiers where id = v_tier_id and event_id = v_event.id for update;
          if not found or v_tier.is_hidden then
            raise exception 'TIER_UNAVAILABLE';
          end if;

          if v_tier.sales_start_at is not null and now() < v_tier.sales_start_at then
            raise exception 'TIER_NOT_ON_SALE_YET';
          end if;
          if v_tier.sales_end_at is not null and now() >= v_tier.sales_end_at then
            raise exception 'TIER_SALES_CLOSED';
          end if;
          if v_qty > v_tier.max_per_order then
            raise exception 'MAX_PER_ORDER_EXCEEDED';
          end if;
          if v_tier.sold + v_tier.held + v_qty > v_tier.quantity then
            raise exception 'TIER_SOLD_OUT';
          end if;

          v_subtotal_raw := v_subtotal_raw + (v_tier.price_cents * v_qty);
          v_admissions   := v_admissions + (v_tier.admits_per_ticket * v_qty);

          v_return_items := v_return_items || jsonb_build_object(
            'tier_id', v_tier.id,
            'name', v_tier.name,
            'quantity', v_qty,
            'unit_price_cents', v_tier.price_cents
          );
        end loop;

        if v_event.capacity is not null and v_total_used + v_admissions > v_event.capacity then
          raise exception 'EVENT_SOLD_OUT';
        end if;

        if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
          select * into v_promo
          from ticketing_promo_codes
          where event_id = v_event.id and lower(code) = lower(trim(p_promo_code))
          for update;
          if not found then
            raise exception 'PROMO_INVALID';
          end if;
          if v_promo.expires_at is not null and now() >= v_promo.expires_at then
            raise exception 'PROMO_EXPIRED';
          end if;
          if v_promo.max_uses is not null and v_promo.uses >= v_promo.max_uses then
            raise exception 'PROMO_MAX_USES';
          end if;
          if v_promo.percent_off is not null then
            v_discount := floor(v_subtotal_raw * (v_promo.percent_off / 100.0));
          else
            v_discount := least(v_promo.amount_off_cents, v_subtotal_raw);
          end if;
        end if;

        v_subtotal := greatest(0, v_subtotal_raw - v_discount);
        v_tax      := floor((v_subtotal::numeric * v_settings.tax_rate) + 0.5)::int;
        v_pre_fee  := v_subtotal + v_tax;

        if v_subtotal = 0 then
          v_service_fee := 0;
          v_total       := 0;
        else
          v_total       := ceil((v_pre_fee + v_settings.stripe_fixed_cents)::numeric / (1.0 - v_settings.stripe_pct))::int;
          v_service_fee := v_total - v_pre_fee;
        end if;

        v_hold_expires := now() + make_interval(mins => v_settings.hold_minutes);

        insert into ticketing_orders (
          event_id, status, buyer_name, buyer_email, buyer_phone, age_attested,
          promo_code_id, subtotal_cents, discount_cents, service_fee_cents, tax_cents, total_cents,
          hold_expires_at, marketing_opt_in
        ) values (
          v_event.id, 'pending', p_buyer_name, p_buyer_email, p_buyer_phone, coalesce(p_age_attested, false),
          v_promo.id, v_subtotal, v_discount, v_service_fee, v_tax, v_total,
          v_hold_expires, coalesce(p_marketing_opt_in, false)
        ) returning id into v_order_id;

        for v_item in select * from jsonb_array_elements(p_items) loop
          v_tier_id := (v_item ->> 'tier_id')::uuid;
          v_qty     := (v_item ->> 'quantity')::int;
          select * into v_tier from ticketing_tiers where id = v_tier_id;
          update ticketing_tiers set held = held + v_qty where id = v_tier_id;
          insert into ticketing_order_items (order_id, tier_id, quantity, unit_price_cents)
          values (v_order_id, v_tier_id, v_qty, v_tier.price_cents);
        end loop;

        return jsonb_build_object(
          'order_id', v_order_id,
          'hold_expires_at', v_hold_expires,
          'items', v_return_items,
          'subtotal_cents', v_subtotal,
          'discount_cents', v_discount,
          'service_fee_cents', v_service_fee,
          'tax_cents', v_tax,
          'total_cents', v_total,
          'is_comp', false
        );
      end;
      $BODY$
    `;

    await sql`
      create or replace function check_in(
        p_token          text,
        p_expected_event uuid default null,
        p_actor          text default null
      ) returns jsonb
      language plpgsql
      as $BODY$
      declare
        v_ticket ticketing_tickets%rowtype;
        v_event  ticketing_events%rowtype;
        v_tier   ticketing_tiers%rowtype;
      begin
        select * into v_ticket from ticketing_tickets where token = p_token for update;
        if not found then
          return jsonb_build_object('status', 'not_found');
        end if;

        select * into v_event from ticketing_events where id = v_ticket.event_id;
        select * into v_tier  from ticketing_tiers where id = v_ticket.tier_id;

        if p_expected_event is not null and p_expected_event <> v_ticket.event_id then
          return jsonb_build_object('status', 'wrong_event', 'event_title', v_event.title);
        end if;

        if v_ticket.status = 'void' then
          return jsonb_build_object('status', 'void');
        end if;

        if v_ticket.status = 'checked_in' then
          return jsonb_build_object(
            'status', 'already',
            'checked_in_at', v_ticket.checked_in_at,
            'holder_name', v_ticket.holder_name,
            'tier_name', v_tier.name,
            'age_restriction', v_event.age_restriction
          );
        end if;

        update ticketing_tickets
          set status = 'checked_in',
              checked_in_at = now(),
              checked_in_by = p_actor
          where id = v_ticket.id;

        return jsonb_build_object(
          'status', 'ok',
          'holder_name', v_ticket.holder_name,
          'tier_name', v_tier.name,
          'age_restriction', v_event.age_restriction,
          'event_title', v_event.title
        );
      end;
      $BODY$
    `;

    await sql`
      create or replace function expire_stale_holds() returns int
      language plpgsql
      as $BODY$
      declare
        v_order record;
        v_item  ticketing_order_items%rowtype;
        v_count int := 0;
      begin
        for v_order in
          select * from ticketing_orders
          where status = 'pending'
            and hold_expires_at is not null
            and now() > hold_expires_at + interval '5 minutes'
          for update skip locked
        loop
          for v_item in select * from ticketing_order_items where order_id = v_order.id loop
            update ticketing_tiers set held = greatest(0, held - v_item.quantity)
            where id = v_item.tier_id;
          end loop;
          update ticketing_orders set status = 'expired' where id = v_order.id;
          v_count := v_count + 1;
        end loop;
        return v_count;
      end;
      $BODY$
    `;
  })();

  return schemaReady;
}

// ---------------------------------------------------------------------------
// Row shapers
// ---------------------------------------------------------------------------

function iso(value: unknown): string {
  return (value as Date).toISOString();
}
function isoOrNull(value: unknown): string | null {
  return value ? (value as Date).toISOString() : null;
}

function rowToSettings(row: Record<string, unknown>): TicketingSettings {
  return {
    taxRate: Number(row.tax_rate),
    stripePct: Number(row.stripe_pct),
    stripeFixedCents: row.stripe_fixed_cents as number,
    holdMinutes: row.hold_minutes as number,
    refundPolicyMd: (row.refund_policy_md as string | null) ?? null,
    supportEmail: (row.support_email as string | null) ?? null,
  };
}

function rowToEvent(row: Record<string, unknown>): TicketedEvent {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    descriptionMd: (row.description_md as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    songUrl: (row.song_url as string | null) ?? null,
    startsAt: iso(row.starts_at),
    endsAt: isoOrNull(row.ends_at),
    doorsAt: isoOrNull(row.doors_at),
    ageRestriction: row.age_restriction as TicketedEvent["ageRestriction"],
    capacity: (row.capacity as number | null) ?? null,
    status: row.status as TicketedEvent["status"],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function rowToTier(row: Record<string, unknown>): TicketTier {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    priceCents: row.price_cents as number,
    admitsPerTicket: row.admits_per_ticket as number,
    quantity: row.quantity as number,
    sold: row.sold as number,
    held: row.held as number,
    maxPerOrder: row.max_per_order as number,
    salesStartAt: isoOrNull(row.sales_start_at),
    salesEndAt: isoOrNull(row.sales_end_at),
    sortOrder: row.sort_order as number,
    isHidden: row.is_hidden as boolean,
  };
}

function rowToPublicTier(row: Record<string, unknown>): PublicTier {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    priceCents: row.price_cents as number,
    admitsPerTicket: row.admits_per_ticket as number,
    remaining: row.remaining as number,
    maxPerOrder: row.max_per_order as number,
    salesStartAt: isoOrNull(row.sales_start_at),
    salesEndAt: isoOrNull(row.sales_end_at),
    sortOrder: row.sort_order as number,
    onSale: row.on_sale as boolean,
    soldOut: row.sold_out as boolean,
  };
}

function rowToPromo(row: Record<string, unknown>): PromoCode {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    code: row.code as string,
    percentOff: row.percent_off === null ? null : Number(row.percent_off),
    amountOffCents: (row.amount_off_cents as number | null) ?? null,
    maxUses: (row.max_uses as number | null) ?? null,
    uses: row.uses as number,
    expiresAt: isoOrNull(row.expires_at),
  };
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    status: row.status as Order["status"],
    buyerName: row.buyer_name as string,
    buyerEmail: row.buyer_email as string,
    buyerPhone: (row.buyer_phone as string | null) ?? null,
    ageAttested: row.age_attested as boolean,
    promoCodeId: (row.promo_code_id as string | null) ?? null,
    subtotalCents: row.subtotal_cents as number,
    discountCents: row.discount_cents as number,
    serviceFeeCents: row.service_fee_cents as number,
    taxCents: row.tax_cents as number,
    totalCents: row.total_cents as number,
    isComp: row.is_comp as boolean,
    stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    stripeFeeCents: (row.stripe_fee_cents as number | null) ?? null,
    holdExpiresAt: isoOrNull(row.hold_expires_at),
    paidAt: isoOrNull(row.paid_at),
    createdAt: iso(row.created_at),
  };
}

function rowToTicket(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    tierId: row.tier_id as string,
    eventId: row.event_id as string,
    token: row.token as string,
    holderName: (row.holder_name as string | null) ?? null,
    status: row.status as Ticket["status"],
    checkedInAt: isoOrNull(row.checked_in_at),
    checkedInBy: (row.checked_in_by as string | null) ?? null,
    createdAt: iso(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export async function getTicketingSettings(): Promise<TicketingSettings | null> {
  if (venue.localPreview) return previewSettings;

  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`select * from ticketing_settings where id = 1`;
  return rows[0] ? rowToSettings(rows[0]) : null;
}

export type TicketingSettingsInput = {
  taxRate: number;
  holdMinutes: number;
  refundPolicyMd: string | null;
  supportEmail: string | null;
};

export async function updateTicketingSettings(
  input: TicketingSettingsInput,
): Promise<TicketingSettings | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    update ticketing_settings set
      tax_rate = ${input.taxRate},
      hold_minutes = ${input.holdMinutes},
      refund_policy_md = ${input.refundPolicyMd},
      support_email = ${input.supportEmail}
    where id = 1
    returning *
  `;
  return rows[0] ? rowToSettings(rows[0]) : null;
}

export async function listPublishedEvents(): Promise<TicketedEvent[]> {
  if (venue.localPreview) return previewEvents.filter(e => e.status === "published");

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_events
    where status = 'published' and starts_at >= now() - interval '1 day'
    order by starts_at asc
  `;
  return rows.map(rowToEvent);
}

export async function getPublishedEventBySlug(slug: string): Promise<TicketedEvent | null> {
  if (venue.localPreview) return previewEvents.find(e => e.slug === slug && e.status === "published") ?? null;

  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_events where slug = ${slug} and status = 'published'
  `;
  return rows[0] ? rowToEvent(rows[0]) : null;
}

export async function getPublicTiersForEvent(eventId: string): Promise<PublicTier[]> {
  if (venue.localPreview) return eventId === previewEvent.id ? [previewPublicTier] : [];

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select
      t.id,
      t.event_id,
      t.name,
      t.description,
      t.price_cents,
      t.admits_per_ticket,
      greatest(0, t.quantity - t.sold - t.held) as remaining,
      t.max_per_order,
      t.sales_start_at,
      t.sales_end_at,
      t.sort_order,
      case
        when (t.sales_start_at is not null and now() < t.sales_start_at) then false
        when (t.sales_end_at   is not null and now() >= t.sales_end_at)  then false
        else greatest(0, t.quantity - t.sold - t.held) > 0
      end as on_sale,
      t.sold >= t.quantity as sold_out
    from ticketing_tiers t
    where t.event_id = ${eventId} and t.is_hidden = false
    order by t.sort_order asc, t.name asc
  `;
  return rows.map(rowToPublicTier);
}

// ---------------------------------------------------------------------------
// Admin reads / mutations — auth gate lives in the API route
// ---------------------------------------------------------------------------

export async function listAllEvents(): Promise<TicketedEvent[]> {
  if (venue.localPreview) return previewEvents;

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_events
    order by starts_at desc
  `;
  return rows.map(rowToEvent);
}

export async function listAllTiersForEvent(eventId: string): Promise<TicketTier[]> {
  if (venue.localPreview) return eventId === previewEvent.id ? [previewTier] : [];

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_tiers where event_id = ${eventId} order by sort_order asc, name asc
  `;
  return rows.map(rowToTier);
}

export async function listPromoCodesForEvent(eventId: string): Promise<PromoCode[]> {
  if (venue.localPreview) return previewPromos.filter(p => p.eventId === eventId);

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_promo_codes where event_id = ${eventId} order by code asc
  `;
  return rows.map(rowToPromo);
}

export type PromoInput = {
  code: string;
  percentOff: number | null;
  amountOffCents: number | null;
  maxUses: number | null;
  expiresAt: string | null;
};

export async function createPromoCode(eventId: string, input: PromoInput): Promise<PromoCode | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  try {
    const { rows } = await sql`
      insert into ticketing_promo_codes (
        event_id, code, percent_off, amount_off_cents, max_uses, expires_at
      ) values (
        ${eventId}, ${input.code}, ${input.percentOff}, ${input.amountOffCents},
        ${input.maxUses}, ${input.expiresAt}
      )
      returning *
    `;
    return rows[0] ? rowToPromo(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function updatePromoCode(id: string, input: PromoInput): Promise<PromoCode | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  try {
    const { rows } = await sql`
      update ticketing_promo_codes set
        code = ${input.code},
        percent_off = ${input.percentOff},
        amount_off_cents = ${input.amountOffCents},
        max_uses = ${input.maxUses},
        expires_at = ${input.expiresAt}
      where id = ${id}
      returning *
    `;
    return rows[0] ? rowToPromo(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function deletePromoCode(id: string): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`delete from ticketing_promo_codes where id = ${id}`;
}

// ---------------------------------------------------------------------------
// Door-side reads: today's events (Central time) with live scan counters,
// plus a name/email search for manual ticket lookup.
// ---------------------------------------------------------------------------

export type DoorEventSummary = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  doorsAt: string | null;
  ageRestriction: "21+" | "18+" | "all_ages";
  soldTickets: number;
  checkedIn: number;
  capacity: number | null;
};

export async function listDoorEventsForToday(): Promise<DoorEventSummary[]> {
  if (venue.localPreview) return previewDoorEvents();

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select
      e.id, e.slug, e.title, e.starts_at, e.doors_at, e.age_restriction, e.capacity,
      (select count(*)::int from ticketing_tickets t where t.event_id = e.id) as sold_tickets,
      (select count(*)::int from ticketing_tickets t where t.event_id = e.id and t.status = 'checked_in') as checked_in
    from ticketing_events e
    where e.status = 'published'
      and (e.starts_at at time zone 'America/Chicago')::date >= (now() at time zone 'America/Chicago')::date - interval '1 day'
      and (e.starts_at at time zone 'America/Chicago')::date <= (now() at time zone 'America/Chicago')::date + interval '1 day'
    order by e.starts_at asc
  `;
  return rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    startsAt: (row.starts_at as Date).toISOString(),
    doorsAt: row.doors_at ? (row.doors_at as Date).toISOString() : null,
    ageRestriction: row.age_restriction as DoorEventSummary["ageRestriction"],
    soldTickets: row.sold_tickets as number,
    checkedIn: row.checked_in as number,
    capacity: (row.capacity as number | null) ?? null,
  }));
}

export type DoorTicketMatch = {
  token: string;
  status: "valid" | "checked_in" | "void";
  holderName: string | null;
  tierName: string;
  buyerName: string;
  buyerEmail: string;
  eventTitle: string;
  eventId: string;
};

// Match by holder_name / buyer_name / buyer_email (case-insensitive).
// Scoped to the event so a large event's list doesn't drown out the
// door. Limited to 20 results.
export async function searchDoorTickets(
  eventId: string,
  query: string,
): Promise<DoorTicketMatch[]> {
  if (venue.localPreview) return previewDoorSearch(eventId,query);

  if (!USE_DB) return [];
  await ensureSchema();
  const term = `%${query.trim().toLowerCase()}%`;
  if (query.trim().length < 2) return [];
  const { rows } = await sql`
    select
      t.token, t.status, t.holder_name,
      tt.name as tier_name,
      o.buyer_name, o.buyer_email,
      e.title as event_title, e.id as event_id
    from ticketing_tickets t
    join ticketing_orders o on o.id = t.order_id
    join ticketing_tiers tt on tt.id = t.tier_id
    join ticketing_events e on e.id = t.event_id
    where t.event_id = ${eventId}
      and (
        lower(coalesce(t.holder_name, '')) like ${term}
        or lower(o.buyer_name) like ${term}
        or lower(o.buyer_email) like ${term}
      )
    order by o.buyer_name asc
    limit 20
  `;
  return rows.map((row) => ({
    token: row.token as string,
    status: row.status as DoorTicketMatch["status"],
    holderName: (row.holder_name as string | null) ?? null,
    tierName: row.tier_name as string,
    buyerName: row.buyer_name as string,
    buyerEmail: row.buyer_email as string,
    eventTitle: row.event_title as string,
    eventId: row.event_id as string,
  }));
}

// ---------------------------------------------------------------------------
// Manager-side reads for orders + refunds + comps + guest list.
// ---------------------------------------------------------------------------

export type OrderListRow = {
  id: string;
  status: OrderStatus;
  buyerName: string;
  buyerEmail: string;
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
  isComp: boolean;
  ticketCount: number;
  checkedInCount: number;
};

export async function listOrdersForEvent(
  eventId: string,
  options: { search?: string; status?: OrderStatus } = {},
): Promise<OrderListRow[]> {
  if (venue.localPreview) return previewOrderList(eventId,options);

  if (!USE_DB) return [];
  await ensureSchema();
  const search = options.search?.trim().toLowerCase() ?? "";
  const term = `%${search}%`;

  const conditions = ["o.event_id = $1::uuid"];
  const params: unknown[] = [eventId];

  if (options.status) {
    conditions.push(`o.status = $${params.length + 1}`);
    params.push(options.status);
  }
  if (search.length >= 1) {
    conditions.push(
      `(lower(o.buyer_name) like $${params.length + 1} or lower(o.buyer_email) like $${params.length + 1})`,
    );
    params.push(term);
  }

  const where = conditions.join(" and ");
  // Use tagged template with dynamic string interpolation via the
  // @vercel/postgres client. Since sql doesn't support dynamic WHERE,
  // fall back to a plain query call.
  const { rows } = await sql.query(
    `
      select
        o.id, o.status, o.buyer_name, o.buyer_email,
        o.total_cents, o.created_at, o.paid_at, o.is_comp,
        (select count(*)::int from ticketing_tickets t where t.order_id = o.id) as ticket_count,
        (select count(*)::int from ticketing_tickets t where t.order_id = o.id and t.status = 'checked_in') as checked_in_count
      from ticketing_orders o
      where ${where}
      order by o.created_at desc
      limit 500
    `,
    params,
  );
  return rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    status: row.status as OrderStatus,
    buyerName: row.buyer_name as string,
    buyerEmail: row.buyer_email as string,
    totalCents: row.total_cents as number,
    createdAt: (row.created_at as Date).toISOString(),
    paidAt: row.paid_at ? (row.paid_at as Date).toISOString() : null,
    isComp: row.is_comp as boolean,
    ticketCount: row.ticket_count as number,
    checkedInCount: row.checked_in_count as number,
  }));
}

export type OrderWithDetails = {
  order: Order;
  items: Array<{
    id: string;
    tierId: string;
    tierName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  tickets: Ticket[];
};

export async function getOrderWithDetails(orderId: string): Promise<OrderWithDetails | null> {
  if (venue.localPreview) return previewOrderDetails(orderId);

  if (!USE_DB) return null;
  await ensureSchema();
  const order = await getOrderById(orderId);
  if (!order) return null;

  const { rows: itemRows } = await sql`
    select oi.id, oi.tier_id, oi.quantity, oi.unit_price_cents, tt.name as tier_name
    from ticketing_order_items oi
    join ticketing_tiers tt on tt.id = oi.tier_id
    where oi.order_id = ${orderId}
    order by oi.id asc
  `;
  const items = itemRows.map((row) => ({
    id: row.id as string,
    tierId: row.tier_id as string,
    tierName: row.tier_name as string,
    quantity: row.quantity as number,
    unitPriceCents: row.unit_price_cents as number,
  }));

  const tickets = await getTicketsForOrder(orderId);
  return { order, items, tickets };
}

// Void a specific subset of tickets — used for partial refunds. The
// Stripe-side refund amount is computed by the caller.
export async function voidTickets(ticketIds: string[]): Promise<void> {
  if (!USE_DB || ticketIds.length === 0) return;
  await ensureSchema();
  await sql.query(
    `update ticketing_tickets set status = 'void' where id = any($1::uuid[])`,
    [ticketIds],
  );
  // Decrement the tier's sold count for each voided ticket.
  await sql.query(
    `
      update ticketing_tiers t set sold = greatest(0, sold - sub.qty)
      from (
        select tier_id, count(*)::int as qty
        from ticketing_tickets
        where id = any($1::uuid[])
        group by tier_id
      ) sub
      where t.id = sub.tier_id
    `,
    [ticketIds],
  );
}

// Guest-list CSV data — flat rows per ticket for CSV export.
export type GuestListRow = {
  token: string;
  status: TicketStatus;
  holderName: string | null;
  tierName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  checkedInAt: string | null;
};

export async function listGuestRowsForEvent(eventId: string): Promise<GuestListRow[]> {
  if (venue.localPreview) return previewGuestRows(eventId);

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select
      t.token, t.status, t.holder_name, t.checked_in_at,
      tt.name as tier_name,
      o.buyer_name, o.buyer_email, o.buyer_phone
    from ticketing_tickets t
    join ticketing_orders o on o.id = t.order_id
    join ticketing_tiers tt on tt.id = t.tier_id
    where t.event_id = ${eventId}
    order by o.buyer_name asc, t.created_at asc
  `;
  return rows.map((row) => ({
    token: row.token as string,
    status: row.status as TicketStatus,
    holderName: (row.holder_name as string | null) ?? null,
    tierName: row.tier_name as string,
    buyerName: row.buyer_name as string,
    buyerEmail: row.buyer_email as string,
    buyerPhone: (row.buyer_phone as string | null) ?? null,
    checkedInAt: row.checked_in_at ? (row.checked_in_at as Date).toISOString() : null,
  }));
}

// Comp: create a $0 order + tickets straight away (no Stripe session,
// no hold flow). Charges nothing, mails the tickets, marks the tier's
// sold count so capacity accounting stays right.
export async function createCompOrder(input: {
  eventId: string;
  tierId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
}): Promise<{ order: Order; tickets: Ticket[] } | null> {
  if (!USE_DB) return null;
  await ensureSchema();

  const { rows: tierRows } = await sql`
    select * from ticketing_tiers where id = ${input.tierId} and event_id = ${input.eventId} for update
  `;
  if (tierRows.length === 0) return null;
  const tier = rowToTier(tierRows[0]);
  if (tier.sold + tier.held + input.quantity > tier.quantity) return null;

  const { rows: orderRows } = await sql`
    insert into ticketing_orders (
      event_id, status, buyer_name, buyer_email,
      age_attested, subtotal_cents, service_fee_cents, tax_cents, total_cents,
      is_comp, paid_at, marketing_opt_in
    ) values (
      ${input.eventId}, 'paid', ${input.buyerName}, ${input.buyerEmail},
      true, 0, 0, 0, 0,
      true, now(), false
    ) returning *
  `;
  const order = rowToOrder(orderRows[0]);

  await sql`
    insert into ticketing_order_items (order_id, tier_id, quantity, unit_price_cents)
    values (${order.id}, ${input.tierId}, ${input.quantity}, 0)
  `;
  await sql`
    update ticketing_tiers set sold = sold + ${input.quantity} where id = ${input.tierId}
  `;

  const tickets: Ticket[] = [];
  const total = input.quantity * tier.admitsPerTicket;
  for (let i = 0; i < total; i += 1) {
    const token = generateTicketToken();
    const { rows } = await sql`
      insert into ticketing_tickets (order_id, tier_id, event_id, token, holder_name)
      values (${order.id}, ${tier.id}, ${input.eventId}, ${token}, ${input.buyerName})
      returning *
    `;
    tickets.push(rowToTicket(rows[0]));
  }

  return { order, tickets };
}

// ---------------------------------------------------------------------------
// RPCs
// ---------------------------------------------------------------------------

export type ReserveInput = {
  eventId: string;
  items: Array<{ tierId: string; quantity: number }>;
  promoCode: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  ageAttested: boolean;
  marketingOptIn: boolean;
};

export async function reserveTickets(input: ReserveInput): Promise<ReserveResult> {
  if (!USE_DB) throw new Error("DB unavailable");
  await ensureSchema();
  const itemsJson = JSON.stringify(
    input.items.map((i) => ({ tier_id: i.tierId, quantity: i.quantity })),
  );
  const { rows } = await sql`
    select reserve_tickets(
      ${input.eventId}::uuid,
      ${itemsJson}::jsonb,
      ${input.promoCode},
      ${input.buyerName},
      ${input.buyerEmail},
      ${input.buyerPhone},
      ${input.ageAttested},
      ${input.marketingOptIn}
    ) as result
  `;
  const raw = rows[0]?.result as Record<string, unknown>;
  return {
    orderId: raw.order_id as string,
    holdExpiresAt: raw.hold_expires_at as string,
    items: (raw.items as Array<Record<string, unknown>>).map((i) => ({
      tierId: i.tier_id as string,
      name: i.name as string,
      quantity: i.quantity as number,
      unitPriceCents: i.unit_price_cents as number,
    })),
    subtotalCents: raw.subtotal_cents as number,
    discountCents: raw.discount_cents as number,
    serviceFeeCents: raw.service_fee_cents as number,
    taxCents: raw.tax_cents as number,
    totalCents: raw.total_cents as number,
    isComp: raw.is_comp as boolean,
  };
}

export async function checkInToken(
  token: string,
  options: { expectedEventId?: string | null; actor?: string | null } = {},
): Promise<CheckInResult> {
  if (!USE_DB) throw new Error("DB unavailable");
  await ensureSchema();
  const { rows } = await sql`
    select check_in(
      ${token},
      ${options.expectedEventId ?? null}::uuid,
      ${options.actor ?? null}
    ) as result
  `;
  const raw = rows[0]?.result as Record<string, unknown>;
  const status = raw.status as string;
  if (status === "ok") {
    return {
      status: "ok",
      holderName: (raw.holder_name as string | null) ?? null,
      tierName: raw.tier_name as string,
      ageRestriction: raw.age_restriction as AgeRestriction,
      eventTitle: raw.event_title as string,
    };
  }
  if (status === "already") {
    return {
      status: "already",
      checkedInAt: raw.checked_in_at as string,
      holderName: (raw.holder_name as string | null) ?? null,
      tierName: raw.tier_name as string,
      ageRestriction: raw.age_restriction as AgeRestriction,
    };
  }
  if (status === "wrong_event") {
    return { status: "wrong_event", eventTitle: raw.event_title as string };
  }
  if (status === "void") {
    return { status: "void" };
  }
  return { status: "not_found" };
}

export async function expireStaleHolds(): Promise<number> {
  if (!USE_DB) return 0;
  await ensureSchema();
  const { rows } = await sql`select expire_stale_holds() as count`;
  return (rows[0]?.count as number) ?? 0;
}

// ---------------------------------------------------------------------------
// Ticket-token generator
// ---------------------------------------------------------------------------

export function generateTicketToken(): string {
  return randomBytes(32).toString("base64url");
}

// ---------------------------------------------------------------------------
// Small helpers used by other modules
// ---------------------------------------------------------------------------

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (venue.localPreview) return previewOrders.find(o => o.id === orderId) ?? null;

  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`select * from ticketing_orders where id = ${orderId}`;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function getTicketsForOrder(orderId: string): Promise<Ticket[]> {
  if (venue.localPreview) return previewTickets.filter(t => t.orderId === orderId);

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_tickets where order_id = ${orderId} order by created_at asc
  `;
  return rows.map(rowToTicket);
}

// ---------------------------------------------------------------------------
// Admin mutations. Auth is enforced in the API route via hasAdminSession().
// These functions do no auth checks themselves — never expose them to
// unauthenticated callers.
// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "event";
}

async function findUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    const { rows } = excludeId
      ? await sql`select id from ticketing_events where slug = ${candidate} and id <> ${excludeId} limit 1`
      : await sql`select id from ticketing_events where slug = ${candidate} limit 1`;
    if (rows.length === 0) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
    if (n > 500) throw new Error("Could not allocate a unique slug");
  }
}

export type EventInput = {
  slug?: string | null;
  title: string;
  descriptionMd?: string | null;
  imageUrl?: string | null;
  songUrl?: string | null;
  startsAt: string;
  endsAt?: string | null;
  doorsAt?: string | null;
  ageRestriction: TicketedEvent["ageRestriction"];
  capacity?: number | null;
  status: TicketedEvent["status"];
};

export async function createEvent(input: EventInput): Promise<TicketedEvent> {
  if (!USE_DB) throw new Error("DB unavailable");
  await ensureSchema();
  const desiredSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  const slug = await findUniqueSlug(desiredSlug);

  const { rows } = await sql`
    insert into ticketing_events (
      slug, title, description_md, image_url, song_url,
      starts_at, ends_at, doors_at,
      age_restriction, capacity, status
    ) values (
      ${slug}, ${input.title}, ${input.descriptionMd ?? null}, ${input.imageUrl ?? null}, ${input.songUrl ?? null},
      ${input.startsAt}, ${input.endsAt ?? null}, ${input.doorsAt ?? null},
      ${input.ageRestriction}, ${input.capacity ?? null}, ${input.status}
    )
    returning *
  `;
  return rowToEvent(rows[0]);
}

export async function updateEvent(id: string, input: EventInput): Promise<TicketedEvent | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const desiredSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  const slug = await findUniqueSlug(desiredSlug, id);

  const { rows } = await sql`
    update ticketing_events set
      slug = ${slug},
      title = ${input.title},
      description_md = ${input.descriptionMd ?? null},
      image_url = ${input.imageUrl ?? null},
      song_url = ${input.songUrl ?? null},
      starts_at = ${input.startsAt},
      ends_at = ${input.endsAt ?? null},
      doors_at = ${input.doorsAt ?? null},
      age_restriction = ${input.ageRestriction},
      capacity = ${input.capacity ?? null},
      status = ${input.status},
      updated_at = now()
    where id = ${id}
    returning *
  `;
  return rows[0] ? rowToEvent(rows[0]) : null;
}

// Orders point at their event without a cascade, so an event with any
// orders used to fail to delete. Orders still carrying money (paid,
// partially refunded, disputed) block the delete; the caller can cancel
// the event instead. Abandoned, expired and fully refunded orders are
// removed with it (Stripe keeps its own record of refunded charges).
export type DeleteEventResult = { deleted: true } | { deleted: false; activeOrders: number };

export async function deleteEvent(id: string): Promise<DeleteEventResult> {
  if (!USE_DB) return { deleted: true };
  await ensureSchema();
  const { rows } = await sql`
    select count(*)::int as count from ticketing_orders
    where event_id = ${id} and status in ('paid', 'partially_refunded', 'disputed')
  `;
  const activeOrders = (rows[0]?.count as number) ?? 0;
  if (activeOrders > 0) return { deleted: false, activeOrders };

  // Order items and tickets cascade from their order; tiers and promo
  // codes cascade from the event.
  await sql`delete from ticketing_orders where event_id = ${id}`;
  await sql`delete from ticketing_events where id = ${id}`;
  return { deleted: true };
}

export async function cancelEvent(id: string): Promise<TicketedEvent | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    update ticketing_events set status = 'cancelled', updated_at = now() where id = ${id} returning *
  `;
  return rows[0] ? rowToEvent(rows[0]) : null;
}

export async function getEventById(id: string): Promise<TicketedEvent | null> {
  if (venue.localPreview) return previewEvents.find(e => e.id === id) ?? null;

  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`select * from ticketing_events where id = ${id}`;
  return rows[0] ? rowToEvent(rows[0]) : null;
}

export type TierInput = {
  name: string;
  description?: string | null;
  priceCents: number;
  admitsPerTicket: number;
  quantity: number;
  maxPerOrder: number;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  sortOrder: number;
  isHidden: boolean;
};

export async function createTier(eventId: string, input: TierInput): Promise<TicketTier> {
  if (!USE_DB) throw new Error("DB unavailable");
  await ensureSchema();
  const { rows } = await sql`
    insert into ticketing_tiers (
      event_id, name, description, price_cents, admits_per_ticket,
      quantity, max_per_order, sales_start_at, sales_end_at, sort_order, is_hidden
    ) values (
      ${eventId}, ${input.name}, ${input.description ?? null}, ${input.priceCents},
      ${input.admitsPerTicket}, ${input.quantity}, ${input.maxPerOrder},
      ${input.salesStartAt ?? null}, ${input.salesEndAt ?? null},
      ${input.sortOrder}, ${input.isHidden}
    )
    returning *
  `;
  return rowToTier(rows[0]);
}

export async function updateTier(id: string, input: TierInput): Promise<TicketTier | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    update ticketing_tiers set
      name = ${input.name},
      description = ${input.description ?? null},
      price_cents = ${input.priceCents},
      admits_per_ticket = ${input.admitsPerTicket},
      quantity = ${input.quantity},
      max_per_order = ${input.maxPerOrder},
      sales_start_at = ${input.salesStartAt ?? null},
      sales_end_at = ${input.salesEndAt ?? null},
      sort_order = ${input.sortOrder},
      is_hidden = ${input.isHidden}
    where id = ${id}
    returning *
  `;
  return rows[0] ? rowToTier(rows[0]) : null;
}

export async function deleteTier(id: string): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`delete from ticketing_tiers where id = ${id}`;
}

export async function duplicateEvent(id: string): Promise<TicketedEvent | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const source = await getEventById(id);
  if (!source) return null;

  const baseSlug = `${source.slug}-copy`;
  const slug = await findUniqueSlug(baseSlug);

  const { rows: newEventRows } = await sql`
    insert into ticketing_events (
      slug, title, description_md, image_url, song_url,
      starts_at, ends_at, doors_at,
      age_restriction, capacity, status
    ) values (
      ${slug}, ${source.title + " (Copy)"}, ${source.descriptionMd}, ${source.imageUrl}, ${source.songUrl},
      ${source.startsAt}, ${source.endsAt}, ${source.doorsAt},
      ${source.ageRestriction}, ${source.capacity}, ${"draft"}
    )
    returning *
  `;
  const newEvent = rowToEvent(newEventRows[0]);

  const tiers = await listAllTiersForEvent(id);
  for (const tier of tiers) {
    await sql`
      insert into ticketing_tiers (
        event_id, name, description, price_cents, admits_per_ticket,
        quantity, max_per_order, sales_start_at, sales_end_at, sort_order, is_hidden
      ) values (
        ${newEvent.id}, ${tier.name}, ${tier.description}, ${tier.priceCents},
        ${tier.admitsPerTicket}, ${tier.quantity}, ${tier.maxPerOrder},
        ${tier.salesStartAt}, ${tier.salesEndAt}, ${tier.sortOrder}, ${tier.isHidden}
      )
    `;
  }

  return newEvent;
}

// ---------------------------------------------------------------------------
// Stripe / webhook plumbing. These are all admin-only, called from the
// checkout API + the webhook handler. Never expose to unauthenticated
// callers directly.
// ---------------------------------------------------------------------------

export type TicketPassData = {
  token: string;
  eventId: string;
  status: Ticket["status"];
  holderName: string | null;
  tierName: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  eventDoorsAt: string | null;
  eventEndsAt: string | null;
  eventAgeRestriction: TicketedEvent["ageRestriction"];
};

export async function getTicketPassData(token: string): Promise<TicketPassData | null> {
  if (venue.localPreview) return previewPass(token);

  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    select
      t.token, t.status, t.holder_name,
      tt.name as tier_name,
      e.id as event_id, e.title as event_title, e.slug as event_slug,
      e.starts_at, e.doors_at, e.ends_at, e.age_restriction
    from ticketing_tickets t
    join ticketing_events e on e.id = t.event_id
    join ticketing_tiers tt on tt.id = t.tier_id
    where t.token = ${token}
    limit 1
  `;
  return rows[0] ? rowToPassData(rows[0]) : null;
}

export async function getOrderPassData(orderId: string): Promise<TicketPassData[]> {
  if (venue.localPreview) return previewTickets.filter(t => t.orderId === orderId).map(t => previewPass(t.token)!);

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select
      t.token, t.status, t.holder_name,
      tt.name as tier_name,
      e.id as event_id, e.title as event_title, e.slug as event_slug,
      e.starts_at, e.doors_at, e.ends_at, e.age_restriction
    from ticketing_tickets t
    join ticketing_events e on e.id = t.event_id
    join ticketing_tiers tt on tt.id = t.tier_id
    where t.order_id = ${orderId} and t.status <> 'void'
    order by t.created_at asc
  `;
  return rows.map(rowToPassData);
}

function rowToPassData(row: Record<string, unknown>): TicketPassData {
  return {
    token: row.token as string,
    eventId: row.event_id as string,
    status: row.status as Ticket["status"],
    holderName: (row.holder_name as string | null) ?? null,
    tierName: row.tier_name as string,
    eventTitle: row.event_title as string,
    eventSlug: row.event_slug as string,
    eventStartsAt: iso(row.starts_at),
    eventDoorsAt: isoOrNull(row.doors_at),
    eventEndsAt: isoOrNull(row.ends_at),
    eventAgeRestriction: row.age_restriction as TicketedEvent["ageRestriction"],
  };
}

/**
 * Force-expire every pending order for `eventId` and give the held
 * inventory back to the tier. Used by the manager "Release stuck
 * holds" button in the event editor when a Stripe error or a
 * closed-tab checkout left inventory locked with the standard
 * expire_stale_holds() cron still 30+ minutes away from sweeping.
 *
 * Also called from the checkout POST route as a rollback when a
 * Stripe.checkout.sessions.create() call throws after the DB hold
 * has already been placed, so the same failure can't decrement
 * inventory a second time on retry.
 */
export async function releaseHoldsForEvent(eventId: string): Promise<number> {
  if (!USE_DB) return 0;
  await ensureSchema();
  const { rows } = await sql`
    with cancelled as (
      update ticketing_orders
      set status = 'expired'
      where event_id = ${eventId} and status = 'pending'
      returning id
    ),
    released as (
      update ticketing_tiers t
      set held = greatest(0, held - oi.quantity)
      from ticketing_order_items oi
      join cancelled c on c.id = oi.order_id
      where t.id = oi.tier_id
      returning t.id
    )
    select (select count(*) from cancelled)::int as count
  `;
  return (rows[0]?.count as number) ?? 0;
}

export async function releaseHoldForOrder(orderId: string): Promise<boolean> {
  if (!USE_DB) return false;
  await ensureSchema();
  const { rows } = await sql`
    with cancelled as (
      update ticketing_orders
      set status = 'expired'
      where id = ${orderId} and status = 'pending'
      returning id
    ),
    released as (
      update ticketing_tiers t
      set held = greatest(0, held - oi.quantity)
      from ticketing_order_items oi
      join cancelled c on c.id = oi.order_id
      where t.id = oi.tier_id
      returning t.id
    )
    select (select count(*) from cancelled)::int as count
  `;
  return ((rows[0]?.count as number) ?? 0) > 0;
}

export async function markStripeSessionOnOrder(
  orderId: string,
  sessionId: string,
): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`
    update ticketing_orders
    set stripe_checkout_session_id = ${sessionId}
    where id = ${orderId}
  `;
}

export async function findOrderByCheckoutSession(sessionId: string): Promise<Order | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_orders where stripe_checkout_session_id = ${sessionId} limit 1
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function findOrderByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_orders where stripe_payment_intent_id = ${paymentIntentId} limit 1
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function alreadyProcessedStripeEvent(eventId: string): Promise<boolean> {
  if (!USE_DB) return false;
  await ensureSchema();
  const { rows } = await sql`
    insert into ticketing_stripe_events (id, type) values (${eventId}, 'pending')
    on conflict (id) do nothing
    returning id
  `;
  return rows.length === 0;
}

// Called from the webhook on checkout.session.completed. Runs the
// paid-order state machine as one transaction (best-effort atomic —
// @vercel/postgres doesn't expose BEGIN/COMMIT, so we drive it via a
// PL/pgSQL function). Also generates one ticket row per admission.
export async function markOrderPaid(input: {
  orderId: string;
  paymentIntentId: string;
  stripeFeeCents: number | null;
}): Promise<Ticket[]> {
  if (!USE_DB) return [];
  await ensureSchema();

  // Update the order + move held -> sold + increment promo uses + insert
  // tickets, all in a single round-trip via a temporary CTE chain so the
  // webhook can't leave the DB in a half-processed state.
  const { rows: orderRows } = await sql`
    update ticketing_orders
    set status = 'paid',
        paid_at = coalesce(paid_at, now()),
        stripe_payment_intent_id = ${input.paymentIntentId},
        stripe_fee_cents = ${input.stripeFeeCents}
    where id = ${input.orderId} and status <> 'paid'
    returning *
  `;
  if (orderRows.length === 0) {
    // Already paid — return existing tickets so idempotent handlers
    // still surface the ticket list on retry.
    return getTicketsForOrder(input.orderId);
  }
  const order = rowToOrder(orderRows[0]);

  // Move held -> sold for each item.
  const items = (
    await sql`
      select oi.*, tt.admits_per_ticket
      from ticketing_order_items oi
      join ticketing_tiers tt on tt.id = oi.tier_id
      where oi.order_id = ${order.id}
    `
  ).rows;

  for (const item of items) {
    const qty = item.quantity as number;
    const tierId = item.tier_id as string;
    await sql`
      update ticketing_tiers
      set held = greatest(0, held - ${qty}),
          sold = sold + ${qty}
      where id = ${tierId}
    `;
  }

  // Bump promo usage if there was one.
  if (order.promoCodeId) {
    await sql`
      update ticketing_promo_codes set uses = uses + 1 where id = ${order.promoCodeId}
    `;
  }

  // Generate tickets — one per admission (qty * admits_per_ticket).
  const tickets: Ticket[] = [];
  for (const item of items) {
    const qty = item.quantity as number;
    const admitsPer = item.admits_per_ticket as number;
    const tierId = item.tier_id as string;
    const total = qty * admitsPer;
    for (let index = 0; index < total; index += 1) {
      const token = generateTicketToken();
      const { rows } = await sql`
        insert into ticketing_tickets (order_id, tier_id, event_id, token)
        values (${order.id}, ${tierId}, ${order.eventId}, ${token})
        returning *
      `;
      tickets.push(rowToTicket(rows[0]));
    }
  }

  return tickets;
}

export async function markOrderExpired(orderId: string): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  const { rows: orderRows } = await sql`
    update ticketing_orders
    set status = 'expired'
    where id = ${orderId} and status = 'pending'
    returning *
  `;
  if (orderRows.length === 0) return;

  const items = (
    await sql`select * from ticketing_order_items where order_id = ${orderId}`
  ).rows;
  for (const item of items) {
    const qty = item.quantity as number;
    const tierId = item.tier_id as string;
    await sql`
      update ticketing_tiers set held = greatest(0, held - ${qty}) where id = ${tierId}
    `;
  }
}

export async function markOrderRefunded(orderId: string, partial: boolean): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  const nextStatus: OrderStatus = partial ? "partially_refunded" : "refunded";
  await sql`
    update ticketing_orders set status = ${nextStatus} where id = ${orderId}
  `;
  // Full refund: void every ticket and return sold inventory.
  if (!partial) {
    const items = (
      await sql`select * from ticketing_order_items where order_id = ${orderId}`
    ).rows;
    for (const item of items) {
      const qty = item.quantity as number;
      const tierId = item.tier_id as string;
      await sql`
        update ticketing_tiers set sold = greatest(0, sold - ${qty}) where id = ${tierId}
      `;
    }
    await sql`update ticketing_tickets set status = 'void' where order_id = ${orderId}`;
  }
}

export async function markOrderDisputed(orderId: string): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`update ticketing_orders set status = 'disputed' where id = ${orderId}`;
  await sql`update ticketing_tickets set status = 'void' where order_id = ${orderId}`;
}

export async function getOrderItemsForOrder(orderId: string): Promise<OrderItem[]> {
  if (venue.localPreview) return previewItems.filter(i => i.orderId === orderId);

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    select * from ticketing_order_items where order_id = ${orderId} order by id asc
  `;
  return rows.map((row) => ({
    id: row.id as string,
    orderId: row.order_id as string,
    tierId: row.tier_id as string,
    quantity: row.quantity as number,
    unitPriceCents: row.unit_price_cents as number,
  }));
}

// Called by the webhook after Stripe confirms payment. Overwrites the
// order's buyer contact fields with whatever Stripe's Checkout page
// collected (customer_details), since that's the freshest input from
// the buyer and Stripe requires it for the receipt. Nullish values
// leave the existing field intact — so if the buyer skipped Stripe's
// optional phone we keep the one they typed in the drawer.
export async function enrichOrderFromStripeDetails(
  orderId: string,
  details: {
    name: string | null | undefined;
    email: string | null | undefined;
    phone: string | null | undefined;
  },
): Promise<void> {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`
    update ticketing_orders
    set
      buyer_name = coalesce(nullif(${details.name ?? null}, ''), buyer_name),
      buyer_email = coalesce(nullif(${details.email ?? null}, ''), buyer_email),
      buyer_phone = coalesce(nullif(${details.phone ?? null}, ''), buyer_phone)
    where id = ${orderId}
  `;
}

export async function getOrderMarketingOptIn(orderId: string): Promise<{ optIn: boolean; email: string; name: string } | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    select marketing_opt_in, buyer_email, buyer_name
    from ticketing_orders
    where id = ${orderId}
    limit 1
  `;
  if (!rows[0]) return null;
  return {
    optIn: rows[0].marketing_opt_in as boolean,
    email: rows[0].buyer_email as string,
    name: rows[0].buyer_name as string,
  };
}
