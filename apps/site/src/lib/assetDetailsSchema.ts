import type { HomepageContentField } from "./siteContentSchema";
import type { StoryImageField } from "./siteContentSchema";

export type AssetDetails = {
  extension: string;
  fileSize: string;
  height: number | null;
  ratio: string;
  suggestedType: string;
  width: number | null;
};

export type HomepageAssetDetails = Record<HomepageContentField, AssetDetails>;
export type StoryAssetDetails = Record<StoryImageField, AssetDetails>;
