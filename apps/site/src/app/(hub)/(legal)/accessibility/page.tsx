import HolderPage from "../../components/HolderPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility — The Public Market",
  description: "The Fort Worth Public Market's commitment to an accessible website and building.",
};

const LAST_UPDATED = "November 12, 2026";

export default function AccessibilityPage() {
  return (
    <HolderPage label="accessibility" pageClassName="page--legal">
      <article className="legal-page">
        <header className="legal-page-header">
          <p className="legal-page-kicker">Fort Worth Public Market</p>
          <h1>Accessibility</h1>
          <p className="legal-page-updated">Last updated {LAST_UPDATED}</p>
        </header>

        <section>
          <h2>Our goal</h2>
          <p>
            We want everyone to be able to use fwpublicmarket.com and every venue page on it. We aim
            to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA across the site.
          </p>
        </section>

        <section>
          <h2>What we do</h2>
          <ul>
            <li>Semantic headings, landmarks, and labels so screen readers can navigate.</li>
            <li>Keyboard access to menus, forms, and interactive pieces.</li>
            <li>Alt text on meaningful images and sufficient color contrast.</li>
            <li>Pages that work at phone sizes and when zoomed.</li>
            <li>Accessibility checks as part of building every new page.</li>
          </ul>
        </section>

        <section>
          <h2>Known limitations</h2>
          <p>
            Some content comes from third parties — reservation and booking forms are provided by
            Tipsy inside a frame, and guest-submitted contest photos may arrive without
            descriptions. We pass accessibility feedback about those to the providers, and we add
            descriptions where we can.
          </p>
        </section>

        <section>
          <h2>At the Market</h2>
          <p>
            The historic Public Market building and its venues — Willow, Madrone, and Public Market
            Cafe &amp; Goods — welcome guests of all abilities. If you have a question about
            physical access, or need an accommodation for a visit or an event, contact us ahead of
            time and we&apos;ll make it work.
          </p>
        </section>

        <section>
          <h2>Tell us if something isn&apos;t working</h2>
          <p>
            If any part of the site is hard to use with assistive technology, we want to know.
            Email <a href="mailto:info@fwpublicmarket.com">info@fwpublicmarket.com</a> (DFW Public
            Market Collective, LLC, d/b/a Fort Worth Public Market) and tell us
            the page and what happened. We&apos;ll do our best to fix it quickly and to get you the
            information you were after in the meantime.
          </p>
        </section>
      </article>
    </HolderPage>
  );
}
