import Link from "next/link";
import { venue } from "@/lib/venue";
import { previewEvent, previewOrder, previewPendingOrder, previewTickets } from "@/lib/previewData";

export default function PreviewNotice({ links = false }: { links?: boolean }) {
  if (!venue.localPreview) return null;
  return <aside className="local-preview-notice" aria-label="Preview data">
    <strong>Preview data</strong><span>Fictional records · app services are not connected.</span>
    {links ? <div className="local-preview-links">
      <Link href={`/calendar/${previewEvent.slug}`}>Sample event</Link>
      <Link href={`/calendar/${previewEvent.slug}/checkout?order=${previewPendingOrder.id}`}>Checkout shell</Link>
      <Link href={`/calendar/${previewEvent.slug}/confirmation?order=${previewOrder.id}`}>Confirmation</Link>
      <Link href={`/t/${previewTickets[0].token}`}>Full ticket</Link>
    </div> : null}
  </aside>;
}
