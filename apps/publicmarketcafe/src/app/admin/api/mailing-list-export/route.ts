import { hasAdminSession } from "@/lib/adminAuth";
import { listSubscribers } from "@/lib/subscribersStore";

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscribers = await listSubscribers();
  const header = "name,email,phone,source,created_at";
  const rows = subscribers.map(
    (subscriber) =>
      `${csvEscape(subscriber.name)},${csvEscape(subscriber.email)},${csvEscape(subscriber.phone)},${csvEscape(subscriber.source)},${csvEscape(subscriber.createdAt)}`,
  );
  const body = [header, ...rows].join("\n");

  const filename = `publicmarketcafe-mailing-list-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
