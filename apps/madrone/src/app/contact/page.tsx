import ContactPageView from "../components/ContactPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const content = await getPublishedSiteContent();
  return <ContactPageView content={content.contact} />;
}
