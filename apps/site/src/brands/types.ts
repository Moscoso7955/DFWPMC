export type BrandSlug = "willow" | "madrone" | "pmcafe";

export type BrandConfig = {
  readonly slug: BrandSlug;
  readonly name: string;
  readonly publicName: string;
  readonly sitePath: `/${string}`;
  readonly logo: string;
  readonly background: string;
  readonly admin: {
    readonly loginPath: `/admin/login/${BrandSlug}`;
    readonly portalPath: `/${string}/admin`;
    readonly portalStatus: "planned";
  };
};
