// Shared by server code and browser components (no server-only imports).

export type Reviewer = "cd" | "md";
export type Mark = "pass" | "fail";
export type PhotoSize = "full" | "view" | "thumb";

export const REVIEWER_LABELS: Record<Reviewer, string> = {
  cd: "Creative Director",
  md: "Marketing Director",
};

/** The directors share one review, stored as the "cd" review. */
export const SHARED_REVIEW: Reviewer = "cd";

export function photoKey(date: string, photoId: string, size: PhotoSize) {
  return `nights/${date}/${photoId}/${size}.jpg`;
}

export function isReviewer(value: unknown): value is Reviewer {
  return value === "cd" || value === "md";
}

export function isNightDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/** A photo shows once either director passes it, unless either failed it. */
export function isShown(marks: Record<Reviewer, Mark | null>) {
  return (marks.cd === "pass" || marks.md === "pass") && marks.cd !== "fail" && marks.md !== "fail";
}
