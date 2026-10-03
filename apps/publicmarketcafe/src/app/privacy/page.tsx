import HolderPage from "@/app/components/HolderPage";
import { readFileSync } from "node:fs";
import path from "node:path";
import { venue } from "@/lib/venue";
export const dynamic = "force-dynamic";
type Policy = { title: string; status: string; sections: { heading: string; text: string }[] };
export default function PolicyPage() {
  const policies = JSON.parse(readFileSync(path.join(process.cwd(), "content", "legal-placeholders.json"), "utf8")) as Record<string, Policy>;
  const policy = policies["privacy"];
  return <HolderPage label={policy.title} pageClassName="page--legal"><article className="legal-page">
    <header className="legal-page-header"><p className="legal-page-kicker">{venue.name}</p><h1>{policy.title}</h1><p className="legal-page-updated">{policy.status}</p></header>
    <section><p>Editable placeholder for {venue.name}. Add the venue&apos;s approved policy before launch.</p></section>
    {policy.sections.map((section,index) => <section key={index}><h2>{section.heading}</h2><p>{section.text}</p></section>)}
  </article></HolderPage>;
}
