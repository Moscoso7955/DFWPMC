import HolderPage from "./HolderPage";
import MenuImageViewer from "./MenuImageViewer";
import type { MenuContent } from "@/lib/siteContentSchema";

type MenuPageViewProps = {
  basePath?: string;
  content: MenuContent;
  isAdmin?: boolean;
  onEdit?: (field: keyof MenuContent) => void;
};

export default function MenuPageView({ basePath = "", content, isAdmin = false, onEdit }: MenuPageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 1 holder - menu" pageClassName="page--menu">
      <section className="menu-page-intro" aria-labelledby="menu-page-title">
        <div className={isAdmin ? "admin-menu-edit-target admin-menu-edit-target--title" : undefined}>
          <h1 id="menu-page-title">{content.title}</h1>
          {isAdmin && onEdit ? (
            <button
              className="admin-edit-hotspot admin-edit-hotspot--menuTitle"
              type="button"
              onClick={() => onEdit("title")}
            >
              <span>Edit Menu Title</span>
            </button>
          ) : null}
        </div>
        <div className={isAdmin ? "admin-menu-edit-target admin-menu-edit-target--image" : undefined}>
          <MenuImageViewer src={content.image} />
          {isAdmin && onEdit ? (
            <button
              className="admin-edit-hotspot admin-edit-hotspot--menuImage"
              type="button"
              onClick={() => onEdit("image")}
            >
              <span>Edit Menu Image</span>
            </button>
          ) : null}
        </div>
      </section>
    </HolderPage>
  );
}
