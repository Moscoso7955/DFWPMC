import { LOCAL_PREVIEW } from "@/lib/venues";

export default function PreviewNotice({ links: _links = false }: { links?: boolean }) {
  if (!LOCAL_PREVIEW) return null;
  return <aside className="local-preview-notice" aria-label="Preview data">
    <strong>Preview data</strong><span>Fictional records · app services are not connected.</span>

  </aside>;
}
