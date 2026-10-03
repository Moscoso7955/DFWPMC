"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

type MenuImageViewerProps = {
  src: string;
};

const MENU_MOBILE_IMAGE_FALLBACKS = [
  {
    match: "1781804230824-11x17-vertical-menu-edited.svg",
    src: "/assets/images/menu-summer-2026-mobile.png",
  },
];

function getMobileImageSrc(src: string) {
  return MENU_MOBILE_IMAGE_FALLBACKS.find((fallback) => src.includes(fallback.match))?.src;
}

function MenuPreviewImage({
  alt,
  mobileSrc,
  src,
  style,
}: {
  alt: string;
  mobileSrc?: string;
  src: string;
  style?: CSSProperties;
}) {
  return (
    <picture className="menu-image-picture">
      {mobileSrc ? <source media="(max-width: 760px)" srcSet={mobileSrc} type="image/png" /> : null}
      <img src={src} alt={alt} style={style} />
    </picture>
  );
}

export default function MenuImageViewer({ src }: MenuImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const mobileSrc = getMobileImageSrc(src);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openViewer = () => {
    setZoom(1);
    setIsOpen(true);
  };

  return (
    <>
      <button className="menu-image-trigger" type="button" onClick={openViewer} aria-label="Open menu preview">
        <MenuPreviewImage src={src} mobileSrc={mobileSrc} alt="Bar Phoebe summer 2026 menu preview" />
      </button>

      {isOpen && (
        <div className="menu-lightbox" role="dialog" aria-modal="true" aria-label="Menu preview">
          <div className="menu-lightbox-toolbar">
            <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>
              -
            </button>
            <button type="button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}>
              +
            </button>
            <button type="button" onClick={() => setIsOpen(false)}>
              X
            </button>
          </div>
          <div className="menu-lightbox-frame">
            <MenuPreviewImage
              src={src}
              mobileSrc={mobileSrc}
              alt="Bar Phoebe summer 2026 menu enlarged"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
