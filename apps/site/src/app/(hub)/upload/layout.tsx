import "@/app/globals.css";
import "@/app/venue-ui.css";
import "../admin/(tools)/hub-admin.css";

export const metadata = { robots: { index: false, follow: false } };

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
