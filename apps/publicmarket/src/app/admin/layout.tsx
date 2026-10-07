import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Collective Admin — The Public Market",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="fwa">{children}</div>;
}
