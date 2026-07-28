"use server";

import { saveReservation } from "@/lib/data";

export interface ReservationFormState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitReservation(
  _prev: ReservationFormState,
  formData: FormData
): Promise<ReservationFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const partySize = Number(formData.get("party_size"));
  const requestedDate = String(formData.get("requested_date") ?? "");
  const requestedTime = String(formData.get("requested_time") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !email || !requestedDate || !requestedTime) {
    return {
      status: "error",
      message: "Please fill in your name, email, date, and time.",
    };
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
    return {
      status: "error",
      message: "Party size must be between 1 and 20. For larger groups, call us.",
    };
  }

  const result = await saveReservation({
    name,
    email,
    phone,
    party_size: partySize,
    requested_date: requestedDate,
    requested_time: requestedTime,
    notes,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }
  return {
    status: "success",
    message:
      "Request received! We'll confirm your table by email shortly.",
  };
}
