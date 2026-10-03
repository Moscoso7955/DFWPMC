"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
import HolderPage from "./HolderPage";
import type { StoryContent, StoryContentField, StoryImageField } from "@/lib/siteContentSchema";
import { STORY_FIELD_LABELS } from "@/lib/siteContentSchema";
type StoryPageViewProps = {
    basePath?: string;
    content: StoryContent;
    isAdmin?: boolean;
    onEdit?: (field: StoryContentField) => void;
};
function StoryEditButton({ field, onEdit, }: {
    field: StoryContentField;
    onEdit?: (field: StoryContentField) => void;
}) {
    if (!onEdit)
        return null;
    return (<button className={`admin-edit-hotspot admin-edit-hotspot--story-${field}`} type="button" onClick={() => onEdit(field)}>
      <span>Edit {STORY_FIELD_LABELS[field]}</span>
    </button>);
}
function StoryImage({ field, isAdmin, onEdit, src, variant, }: {
    field: StoryImageField;
    isAdmin: boolean;
    onEdit?: (field: StoryContentField) => void;
    src: string;
    variant: "square" | "tall";
}) {
    return (<figure className={`story-image story-image--${variant}${isAdmin ? " admin-story-edit-target" : ""}`}>
      <img src={venuePath(src)} alt=""/>
      {isAdmin ? <StoryEditButton field={field} onEdit={onEdit}/> : null}
    </figure>);
}
export default function StoryPageView({ basePath = "", content, isAdmin = false, onEdit }: StoryPageViewProps) {
    const [isCopyExpanded, setIsCopyExpanded] = useState(false);
    return (<HolderPage basePath={basePath} label="page 5 holder - story" pageClassName="page--story">
      <section className="story-layout" aria-labelledby="story-title">
        <div className="story-media-column" aria-hidden={isAdmin ? undefined : true}>
          <StoryImage field="imageShadow" isAdmin={isAdmin} onEdit={onEdit} src={venuePath(content.imageShadow)} variant="square"/>
          <div className="story-tall-row">
            <StoryImage field="imageNapkin" isAdmin={isAdmin} onEdit={onEdit} src={venuePath(content.imageNapkin)} variant="tall"/>
            <StoryImage field="imageBar" isAdmin={isAdmin} onEdit={onEdit} src={venuePath(content.imageBar)} variant="tall"/>
          </div>
        </div>

        <article className={`story-copy${isAdmin ? " admin-story-edit-target" : ""}`}>
          <h1 id="story-title" className="sr-only">
            Our Story
          </h1>
          <div className={`story-copy-text story-copy-text--${isCopyExpanded ? "expanded" : "collapsed"}`}>
            <p>{content.copy}</p>
          </div>
          {isCopyExpanded ? null : (<button className="story-copy-expand" type="button" aria-label="Expand story copy" onClick={() => setIsCopyExpanded(true)}>
              <span aria-hidden="true">↓</span>
              <span>Read More</span>
            </button>)}
          {isAdmin ? <StoryEditButton field="copy" onEdit={onEdit}/> : null}
        </article>

        <div className="story-media-column" aria-hidden={isAdmin ? undefined : true}>
          <StoryImage field="imageLetter" isAdmin={isAdmin} onEdit={onEdit} src={venuePath(content.imageLetter)} variant="square"/>
          <div className="story-tall-row">
            <StoryImage field="imageCards" isAdmin={isAdmin} onEdit={onEdit} src={venuePath(content.imageCards)} variant="tall"/>
            <StoryImage field="imagePhotoBooth" isAdmin={isAdmin} onEdit={onEdit} src={venuePath(content.imagePhotoBooth)} variant="tall"/>
          </div>
        </div>
      </section>
    </HolderPage>);
}
