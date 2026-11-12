import HolderPage from "../../components/HolderPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — The Public Market",
  description: "The terms that govern fwpublicmarket.com and its venue pages.",
};

const LAST_UPDATED = "November 12, 2026";

export default function TermsPage() {
  return (
    <HolderPage label="terms of use" pageClassName="page--legal">
      <article className="legal-page">
        <header className="legal-page-header">
          <p className="legal-page-kicker">Fort Worth Public Market</p>
          <h1>Terms of Use</h1>
          <p className="legal-page-updated">Last updated {LAST_UPDATED}</p>
        </header>

        <section>
          <p>
            These terms are an agreement between you and DFW Public Market Collective, LLC, a
            Texas limited liability company doing business as the Fort Worth Public Market. They
            govern fwpublicmarket.com, including the venue pages for Willow, Madrone, and Public
            Market Cafe &amp; Goods. By using the site you agree to them. If you
            don&apos;t agree, please don&apos;t use the site.
          </p>
        </section>

        <section>
          <h2>Who can use the site</h2>
          <p>
            Anyone can browse. Parts of the Public Market, including Willow, are 21+ premises;
            visiting those venues requires being of legal age, and events may carry their own age
            restrictions, checked at the door with valid ID.
          </p>
        </section>

        <section>
          <h2>Reservations and private events</h2>
          <p>
            Reservation and private-event requests go through our partner Tipsy&apos;s forms.
            Submitting a request is an inquiry, not a confirmed booking, until we or Tipsy confirm
            it. Any deposits, minimums, or cancellation terms for a private event are stated in the
            event agreement, not on this site.
          </p>
        </section>

        <section>
          <h2>Photo contests and photos</h2>
          <p>
            When you enter a photo event (like a costume contest), you confirm the photo is of you,
            or that you have permission from the person in it, and you give the Public Market a
            non-exclusive license to show the photo on the voting page, our Market Nights pages, and
            our social accounts. You can withdraw an entry — use the takedown link or contact us,
            and we&apos;ll remove it. Entries are screened before they appear, and we may remove any
            entry at our discretion. Photos our photographers take at the Market may be published on
            our Market Nights pages and social accounts; if you&apos;re in one and want it removed,
            tell us and we&apos;ll take it down.
          </p>
        </section>

        <section>
          <h2>Content on this site</h2>
          <p>
            Everything on the site — text, photos, logos, menus, and design — belongs to the Public
            Market or its licensors. Photos published on our Market Nights pages are free for the
            guests in them to download and share personally. Beyond that, don&apos;t reproduce our
            content commercially without permission. Menus, hours, and programming change; what the
            site shows may occasionally lag reality.
          </p>
        </section>

        <section>
          <h2>Third-party services</h2>
          <p>
            Parts of the site are powered by third parties — Tipsy for reservations and bookings,
            Vercel for hosting and analytics, Resend for email, Cloudflare for photo storage. Their
            terms govern their services. We&apos;re not responsible for third-party sites we link
            to.
          </p>
        </section>

        <section>
          <h2>What we don&apos;t promise</h2>
          <p>
            The site is provided &ldquo;as is.&rdquo; We don&apos;t promise it will always be
            available, error-free, or current. To the fullest extent the law allows, we disclaim all
            warranties, express or implied.
          </p>
        </section>

        <section>
          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent the law allows, the Public Market isn&apos;t liable for indirect,
            incidental, special, or consequential damages arising from your use of the site. Nothing
            in these terms limits liability that can&apos;t be limited under applicable law.
          </p>
        </section>

        <section>
          <h2>Governing law and disputes</h2>
          <p>
            These terms are governed by the laws of the State of Texas. Any dispute will be resolved
            in the state or federal courts located in Tarrant County, Texas, and you consent to
            their jurisdiction.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            We may update these terms from time to time; the &ldquo;Last updated&rdquo; date at the
            top will change when we do. Continuing to use the site after a change means you accept
            the new terms.
          </p>
        </section>

        <section>
          <h2>How to reach us</h2>
          <p>
            DFW Public Market Collective, LLC
            <br />
            d/b/a Fort Worth Public Market
            <br />
            1400 Henderson St
            <br />
            Fort Worth, TX 76102
            <br />
            <a href="mailto:info@fwpublicmarket.com">info@fwpublicmarket.com</a>
          </p>
        </section>
      </article>
    </HolderPage>
  );
}
