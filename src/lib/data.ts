import { getSupabase } from "./supabase";
import { seedMenu } from "./menu-data";
import type { MenuCategory, MenuItem, ReservationRequest } from "./types";

/** Fetch the full menu, grouped by category. Falls back to seed data. */
export async function getMenu(): Promise<MenuCategory[]> {
  const supabase = getSupabase();
  if (!supabase) return seedMenu;

  const [{ data: categories, error: catError }, { data: items, error: itemError }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, description, sort_order")
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name, description, price, category_id, is_featured, is_available, dietary_tags"
        )
        .eq("is_available", true),
    ]);

  if (catError || itemError || !categories?.length) return seedMenu;

  return categories.map((cat) => ({
    ...cat,
    items: (items ?? []).filter((item) => item.category_id === cat.id),
  }));
}

/** Featured dishes for the home page. */
export async function getFeaturedItems(): Promise<MenuItem[]> {
  const menu = await getMenu();
  return menu.flatMap((cat) => cat.items).filter((item) => item.is_featured);
}

export type ReservationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Store a reservation request. Without Supabase configured, requests are
 * accepted but not persisted (development mode).
 */
export async function saveReservation(
  reservation: ReservationRequest
): Promise<ReservationResult> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn(
      "[reservations] Supabase not configured — request accepted but not stored:",
      reservation
    );
    return { ok: true };
  }

  const { error } = await supabase.from("reservations").insert(reservation);
  if (error) {
    console.error("[reservations] insert failed:", error.message);
    return {
      ok: false,
      error: "We couldn't save your reservation. Please call us instead.",
    };
  }
  return { ok: true };
}
