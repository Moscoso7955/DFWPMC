import "server-only";
import { readCMSDocument, updateCMSDocument } from "./cms";
import type { CollectiveVenue } from "./venues";
import type { SiteContent } from "./schema";

// The unified admin edits the same draft/published documents each venue
// site reads. "Publish" copies the whole draft over published, matching
// the semantics of the original per-venue portals.

export async function getDraftContent(venue: CollectiveVenue): Promise<SiteContent> {
  const draft = await readCMSDocument<SiteContent>(venue, "draft");
  if (draft) return draft.value;
  const published = await readCMSDocument<SiteContent>(venue, "published");
  if (published) return published.value;
  throw new Error(`No CMS content found for ${venue.name}. Check the store token and scope.`);
}

export async function getPublishedContent(venue: CollectiveVenue): Promise<SiteContent | null> {
  const published = await readCMSDocument<SiteContent>(venue, "published");
  return published?.value ?? null;
}

export async function updateDraftField(
  venue: CollectiveVenue,
  section: keyof SiteContent,
  field: string,
  value: string,
): Promise<SiteContent> {
  const seed = await getDraftContent(venue);
  return updateCMSDocument<SiteContent, SiteContent>(venue, "draft", () => seed, (current) => {
    const sectionValue = { ...(current[section] as Record<string, unknown>), [field]: value };
    const next = { ...current, [section]: sectionValue } as SiteContent;
    return { value: next, result: next };
  });
}

export async function publishDraft(venue: CollectiveVenue): Promise<void> {
  const draft = await readCMSDocument<SiteContent>(venue, "draft");
  if (!draft) throw new Error(`No draft content exists for ${venue.name}.`);
  await updateCMSDocument<SiteContent, void>(venue, "published", () => draft.value, () => ({
    value: draft.value,
    result: undefined,
  }));
}

export async function discardDraft(venue: CollectiveVenue): Promise<void> {
  const published = await readCMSDocument<SiteContent>(venue, "published");
  if (!published) throw new Error(`No published content exists for ${venue.name}.`);
  await updateCMSDocument<SiteContent, void>(venue, "draft", () => published.value, () => ({
    value: published.value,
    result: undefined,
  }));
}
