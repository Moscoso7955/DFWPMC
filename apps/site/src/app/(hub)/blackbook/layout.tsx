import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/venue-ui.css";
import "../admin/(tools)/hub-admin.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BlackbookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
