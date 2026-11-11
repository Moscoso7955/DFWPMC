"use client";
import { useVenue } from "@/app/components/VenueProvider";
import { useRouter } from "next/navigation";
type Props = {
    fallbackHref: string;
    label?: string;
};
// Back to whatever admin screen the user came from; if they landed here
// directly (new tab, bookmark), go to the page's natural parent instead.
export default function AdminBackLink({ fallbackHref, label = "Back" }: Props) {
    const { venuePath } = useVenue();
    const router = useRouter();
    return (<a className="admin-back-link" href={venuePath(fallbackHref)} onClick={(event) => {
            const cameFromSite = document.referrer.startsWith(window.location.origin);
            if (cameFromSite && window.history.length > 1) {
                event.preventDefault();
                router.back();
            }
        }}>
      <span aria-hidden="true">←</span> {label}
    </a>);
}
