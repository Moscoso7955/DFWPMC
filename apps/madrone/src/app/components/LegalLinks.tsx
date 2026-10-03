import Link from "next/link";

// Privacy · Terms · Accessibility, shown in the menu drawer and under
// the homepage menu so the policies are one tap from every page.
export default function LegalLinks({ className = "legal-links" }: { className?: string }) {
  return (
    <div className={className}>
      <Link href="/privacy">Privacy</Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms">Terms</Link>
      <span aria-hidden="true">·</span>
      <Link href="/accessibility">Accessibility</Link>
    </div>
  );
}
