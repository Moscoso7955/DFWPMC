import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { ReservationForm } from "./reservation-form";

export const metadata: Metadata = {
  title: "Reservations",
};

export default function ReservationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-center font-display text-5xl">Book a table</h1>
      <p className="mt-4 text-center text-charcoal/60">
        Tell us when you&apos;d like to join us and we&apos;ll confirm by
        email. For same-day reservations or parties over 20, call{" "}
        <a
          href={`tel:${siteConfig.phone}`}
          className="font-medium text-ember hover:underline"
        >
          {siteConfig.phone}
        </a>
        .
      </p>
      <div className="mt-12">
        <ReservationForm />
      </div>
    </div>
  );
}
