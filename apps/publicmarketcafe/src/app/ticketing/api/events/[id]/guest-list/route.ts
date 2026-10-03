import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { getEventById, listGuestRowsForEvent } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await hasTicketingManagerSession())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id: eventId } = await context.params;

  const [event, rows] = await Promise.all([
    getEventById(eventId),
    listGuestRowsForEvent(eventId),
  ]);
  if (!event) return new Response("Not found", { status: 404 });

  const header = "buyer_name,buyer_email,buyer_phone,tier,ticket_id,holder_name,status,checked_in_at";
  const body = [
    header,
    ...rows.map((r) =>
      [
        csvEscape(r.buyerName),
        csvEscape(r.buyerEmail),
        csvEscape(r.buyerPhone ?? ""),
        csvEscape(r.tierName),
        csvEscape(r.token.slice(0, 12).toUpperCase()),
        csvEscape(r.holderName ?? ""),
        csvEscape(r.status),
        csvEscape(r.checkedInAt ?? ""),
      ].join(","),
    ),
  ].join("\n");

  const filename = `guest-list-${event.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
