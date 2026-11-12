import AdminShell from "../AdminShell";
import { listContactSubmissions } from "@/lib/contactSubmissionsStore";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";
export const dynamic = "force-dynamic";
function formatDate(iso: string) {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}
export default async function AdminSubmissionsPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
    await requireAdminSession();
    const submissions = await listContactSubmissions(venue);
    return (<AdminShell venue={venue} layout="tool">
      <section className="admin-submissions">
        <h1>Contact Submissions</h1>
        <p className="admin-submissions-note">
          Form submissions saved locally from this venue’s contact page. Email delivery is not connected.
        </p>
        {submissions.length === 0 ? (<p>No submissions yet.</p>) : (<ul className="admin-submissions-list">
            {submissions.map((submission) => (<li key={submission.id} className="admin-submission">
                <div className="admin-submission-meta">
                  <span>{submission.name || "—"}</span>
                  <a className="admin-submission-email" href={(`mailto:${submission.email}`)}>{submission.email}</a>
                  <span>{formatDate(submission.createdAt)}</span>
                  <a className="admin-submission-reply" href={`mailto:${submission.email}?subject=${encodeURIComponent(`Re: your message to ${venue.name}`)}`}>
                    Reply
                  </a>
                </div>
                {submission.message ? <p className="admin-submission-message">{submission.message}</p> : null}
              </li>))}
          </ul>)}
      </section>
    </AdminShell>);
}
