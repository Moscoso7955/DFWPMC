import HolderPage from "../../components/HolderPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — The Public Market",
  description: "How the Fort Worth Public Market collects, uses, and protects your information.",
};

const LAST_UPDATED = "November 12, 2026";

export default function PrivacyPage() {
  return (
    <HolderPage label="privacy policy" pageClassName="page--legal">
      <article className="legal-page">
        <header className="legal-page-header">
          <p className="legal-page-kicker">Fort Worth Public Market</p>
          <h1>Privacy Policy</h1>
          <p className="legal-page-updated">Last updated {LAST_UPDATED}</p>
        </header>

        <section>
          <p>
            The Fort Worth Public Market (&ldquo;the Public Market,&rdquo; &ldquo;we,&rdquo; or
            &ldquo;us&rdquo;) operates fwpublicmarket.com and the venues inside the historic Public
            Market building in Fort Worth, Texas — Willow, Madrone, and Public Market Cafe &amp;
            Goods. This policy covers the whole site, including each venue&apos;s pages. It explains
            what we collect, how we use it, and who we share it with.
          </p>
          <p>
            We try to collect only what we need to run the business — send you what you asked for,
            take a reservation, or answer a message.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <h3>Information you give us directly</h3>
          <ul>
            <li>
              <strong>Contact forms:</strong> your name, email, and the message you send, on the
              Market&apos;s or any venue&apos;s contact page.
            </li>
            <li>
              <strong>Newsletter signups:</strong> your name and email address.
            </li>
            <li>
              <strong>Reservation inquiries:</strong> the information you provide to our reservation
              partner Tipsy (name, email, date, party size, and anything else you type in). We
              receive a copy so we can prepare for your visit.
            </li>
            <li>
              <strong>Private-event inquiries:</strong> the information you provide through the same
              Tipsy form for buyouts and private bookings.
            </li>
            <li>
              <strong>Careers applications:</strong> the information you submit through a careers
              form.
            </li>
            <li>
              <strong>Photo contests:</strong> if you enter a photo event (like a costume contest)
              we keep your photo, the name and caption you type, and your IP address. To allow one
              entry and one vote per phone we keep an anonymous random id on your phone and record
              which entry it voted for, with its IP address, to catch repeat voting. Photos are
              checked automatically by Anthropic&apos;s Claude before they appear, and may later
              join our Market Nights photo pages. Ask us and we&apos;ll take yours down.
            </li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>
              <strong>Usage analytics:</strong> our host Vercel provides privacy-first, cookieless
              analytics that measure pages viewed, referrers, general location (country and region),
              and device type. It does not identify individual visitors.
            </li>
            <li>
              <strong>Ad measurement:</strong> when active, Google Ads conversion tracking and the
              Meta (Facebook and Instagram) Pixel record completed reservation and booking requests
              so we can see which ads work. See the &ldquo;Cookies&rdquo; section below.
            </li>
            <li>
              <strong>Menu-click counters:</strong> when you tap a link in a venue&apos;s menu we
              record the destination so we know which pages people visit most. We don&apos;t log
              your identity, IP address, or anything that would tie the tap back to you.
            </li>
            <li>
              <strong>Server logs:</strong> Vercel (our hosting provider) logs standard request
              information (IP address, timestamp, path, user agent) for a limited time for security
              and troubleshooting.
            </li>
          </ul>
        </section>

        <section>
          <h2>Photos taken at the Market</h2>
          <p>
            Our photographers shoot some nights and events, and published photos appear on our
            Market Nights pages, free for guests to download, and sometimes on our social accounts.
            If you&apos;re in a photo and want it removed, use the takedown link on the photo page
            or message us, and we&apos;ll take it down.
          </p>
        </section>

        <section>
          <h2>How we use your information</h2>
          <ul>
            <li>Respond to your inquiries and messages.</li>
            <li>Send you the newsletter you subscribed to. You can unsubscribe at any time.</li>
            <li>Confirm reservations and private-event bookings.</li>
            <li>Meet our tax, accounting, and legal obligations.</li>
            <li>Improve the site and understand which programming and pages people care about.</li>
            <li>Prevent fraud and abuse.</li>
          </ul>
        </section>

        <section>
          <h2>Who we share it with</h2>
          <p>
            We don&apos;t sell your personal information. We share it only with service providers
            that help us run the site and the business:
          </p>
          <ul>
            <li>
              <strong>Vercel</strong> — hosts the website, provides analytics, and stores our
              database.
            </li>
            <li>
              <strong>Resend</strong> — delivers our transactional and newsletter emails.
            </li>
            <li>
              <strong>Tipsy</strong> — powers our reservation and private-events forms. Submissions
              are stored in their system; we receive a copy.
            </li>
            <li>
              <strong>Cloudflare</strong> — stores and serves the photos on our Market Nights and
              contest pages.
            </li>
            <li>
              <strong>Anthropic</strong> — checks photo contest entries for explicit content before
              they appear. Photos are sent only for that check.
            </li>
            <li>
              <strong>Google</strong> — provides Google Ads conversion measurement when it applies,
              and the staff sign-in described below.
            </li>
            <li>
              <strong>Meta</strong> — provides Facebook and Instagram ad measurement when it
              applies.
            </li>
            <li>
              <strong>Professional advisors</strong> — attorneys, accountants, and auditors under a
              duty of confidence, when needed.
            </li>
          </ul>
          <p>
            We&apos;ll also share information if we&apos;re required to by law, court order, or
            legitimate government request, or if we need to protect the Public Market, our staff,
            our guests, or the public from harm.
          </p>
        </section>

        <section>
          <h2>Staff sign-in with Google</h2>
          <p>
            Public Market staff and invited partners (managers, door staff, photographers) sign in
            to our admin tools with Google. Guests never need to. When you sign in, Google shares
            your name, email address and a Google account ID with us. That&apos;s all we ask for; we
            don&apos;t get your password, contacts, files or anything else in your Google account.
          </p>
          <ul>
            <li>
              <strong>How we use it:</strong> only to check that you were invited, sign you in, and
              show your name to the rest of the team.
            </li>
            <li>
              <strong>Who we share it with:</strong> no one. It isn&apos;t sold, used for
              advertising, or used to train AI models.
            </li>
            <li>
              <strong>How long we keep it:</strong> while you have access. Ask an admin, or email{" "}
              <a href="mailto:info@fwpublicmarket.com">info@fwpublicmarket.com</a>, and we&apos;ll
              remove it. You can also disconnect the Public Market from your Google account at any
              time at myaccount.google.com/connections.
            </li>
          </ul>
          <p>
            Our use of information received from Google follows the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>
            , including its Limited Use requirements.
          </p>
        </section>

        <section>
          <h2>Cookies and similar technologies</h2>
          <ul>
            <li>
              <strong>Session cookies:</strong> if you sign in to the site admin, the photo upload
              portal, or the Blackbook, we set an authentication cookie so you stay signed in. These
              are strictly necessary and can&apos;t be disabled without breaking the sign-in.
            </li>
            <li>
              <strong>Photo contest cookie:</strong> pm_device, an anonymous random id that limits
              entries and votes to one per phone. It holds nothing about who you are.
            </li>
            <li>
              <strong>Ad cookies:</strong> when active, Google Ads and the Meta Pixel set cookies to
              attribute conversions to ads. You can control these in your Google, Facebook or
              Instagram ad settings, in your browser, or with an ad blocker.
            </li>
            <li>
              <strong>Vercel Analytics:</strong> cookieless. No cross-site or cross-visit tracking.
            </li>
          </ul>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>
              <strong>Newsletter subscribers:</strong> until you unsubscribe. When you unsubscribe
              we keep a suppression record (email + timestamp + reason) so we don&apos;t email you
              by accident later. That record is the entirety of what we retain about you
              post-optout.
            </li>
            <li>
              <strong>Contact-form submissions:</strong> we keep them so we can respond and follow
              up.
            </li>
            <li>
              <strong>Contest entries and votes:</strong> for the event and a reasonable time after,
              unless you ask us to remove your entry sooner.
            </li>
            <li>
              <strong>Analytics:</strong> aggregated only; individual event data is not retained.
            </li>
            <li>
              <strong>Server logs:</strong> retained by Vercel per their published retention.
            </li>
          </ul>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>You can, at any time:</p>
          <ul>
            <li>
              <strong>Unsubscribe</strong> from the newsletter using the link at the bottom of any
              email we send.
            </li>
            <li>
              <strong>Ask for a copy</strong> of the information we have about you.
            </li>
            <li>
              <strong>Ask us to correct</strong> anything that&apos;s inaccurate.
            </li>
            <li>
              <strong>Ask us to delete</strong> your information, subject to our legal obligation to
              keep certain records.
            </li>
          </ul>
          <p>
            Email us at <a href="mailto:info@fwpublicmarket.com">info@fwpublicmarket.com</a> to
            exercise any of these rights. We&apos;ll respond within 30 days.
          </p>
          <h3>California residents</h3>
          <p>
            If you live in California, you have additional rights under the California Consumer
            Privacy Act. You may request the categories and specific pieces of personal information
            we&apos;ve collected about you, request deletion, and opt out of any &ldquo;sale&rdquo;
            or &ldquo;share&rdquo; of your information. We don&apos;t sell your personal
            information. To exercise these rights, email us at the address above.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            Parts of the Public Market, including Willow, are 21+ premises. The website is not
            directed at children, and we do not knowingly collect personal information from anyone
            under 13. If you believe a child has provided us information, please contact us so we
            can delete it.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            We use industry-standard measures to protect information in transit and at rest,
            including TLS on every page and encrypted database storage. No system is perfectly
            secure. If you have reason to believe your interaction with us is no longer secure,
            please tell us right away.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>
            We&apos;ll update this page whenever material things change, and we&apos;ll update the
            &ldquo;Last updated&rdquo; date at the top. Continuing to use the site after a change
            means you&apos;ve accepted the new terms.
          </p>
        </section>

        <section>
          <h2>How to reach us</h2>
          <p>
            Fort Worth Public Market
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
