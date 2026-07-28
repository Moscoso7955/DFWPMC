import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-display-src",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-body-src",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
