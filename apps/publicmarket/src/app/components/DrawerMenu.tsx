"use client";

import Link from "next/link";
import { brands } from "@/brands";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const venueDetails = { willow: "Cocktail Bar & Lounge", madrone: "Fine Texas Dining", pmcafe: "Cafe & Goods" } as const;
const venueItems = brands.map((brand) => ({
  label: brand.slug === "pmcafe" ? "Public Market" : brand.publicName,
  detail: venueDetails[brand.slug],
  href: brand.sitePath,
}));

const primaryItems = [
  { label: "Location", href: "/visit" },
] as const;

type DrawerMenuProps = {
  adaptive?: boolean;
  basePath?: string;
  hideOnDesktop?: boolean;
  inTopbar?: boolean;
};

function getMenuHref(basePath: string, href: string) {
  if (href === "/") return basePath || "/";
  return `${basePath}${href}`;
}

export default function DrawerMenu({
  adaptive = false,
  basePath = "",
  hideOnDesktop = false,
  inTopbar = false,
}: DrawerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hamburgerColor, setHamburgerColor] = useState("#355748");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", isOpen);

    return () => document.body.classList.remove("drawer-open");
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
      if (isOpen && event.key === "Tab") {
        const items = menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (hideOnDesktop || inTopbar) return;

    const updateHeader = () => {
      document.body.classList.toggle("holder-header-compact", window.scrollY > 24);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);

    return () => {
      document.body.classList.remove("holder-header-compact");
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, [hideOnDesktop, inTopbar]);

  useEffect(() => {
    if (!adaptive) return;

    const getCanvas = () => {
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      return canvasRef.current;
    };

    const updateColor = () => {
      if (isOpen) {
        setHamburgerColor("#355748");
        return;
      }

      const button = buttonRef.current;
      const mobileMatch = window.matchMedia("(max-width: 760px)").matches;

      if (!button || !mobileMatch) {
        setHamburgerColor("#355748");
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const centerX = buttonRect.left + buttonRect.width / 2;
      const centerY = buttonRect.top + buttonRect.height / 2;

      button.style.pointerEvents = "none";
      const elementBehind = document.elementFromPoint(centerX, centerY);
      button.style.pointerEvents = "";

      const image = elementBehind
        ?.closest(".mobile-image-panel")
        ?.querySelector("img") as HTMLImageElement | null;

      if (!image || !image.complete || !image.naturalWidth) {
        setHamburgerColor("#F2F1EB");
        return;
      }

      const imageRect = image.getBoundingClientRect();
      const naturalX = ((centerX - imageRect.left) / imageRect.width) * image.naturalWidth;
      const naturalY = ((centerY - imageRect.top) / imageRect.height) * image.naturalHeight;
      const sampleSize = 24;
      const canvas = getCanvas();
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) return;

      canvas.width = sampleSize;
      canvas.height = sampleSize;

      try {
        context.drawImage(
          image,
          naturalX - sampleSize / 2,
          naturalY - sampleSize / 2,
          sampleSize,
          sampleSize,
          0,
          0,
          sampleSize,
          sampleSize,
        );

        const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
        let luminanceTotal = 0;

        for (let index = 0; index < pixels.length; index += 4) {
          luminanceTotal +=
            0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
        }

        setHamburgerColor(luminanceTotal / (pixels.length / 4) < 145 ? "#F2F1EB" : "#355748");
      } catch {
        setHamburgerColor("#F2F1EB");
      }
    };

    updateColor();
    window.addEventListener("scroll", updateColor, { passive: true });
    window.addEventListener("resize", updateColor);
    document.querySelectorAll(".mobile-image-panel img").forEach((image) => {
      image.addEventListener("load", updateColor);
    });

    return () => {
      window.removeEventListener("scroll", updateColor);
      window.removeEventListener("resize", updateColor);
      document.querySelectorAll(".mobile-image-panel img").forEach((image) => {
        image.removeEventListener("load", updateColor);
      });
    };
  }, [adaptive, isOpen]);

  return (
    <>
      <button
        className={`hamburger${hideOnDesktop ? " homepage-hamburger" : ""}${inTopbar ? " topbar-hamburger" : ""}${isOpen ? " is-hidden" : ""}`}
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="site-menu"
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        onClick={() => setIsOpen((value) => !value)}
        ref={buttonRef}
        style={{
          "--hamburger-color": inTopbar ? "#355748" : hamburgerColor,
          color: "var(--public-market-green)",
        } as CSSProperties}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        className={`drawer-menu${hideOnDesktop ? " homepage-drawer" : ""}${isOpen ? " is-open" : ""}`}
        id="site-menu"
        aria-label="Site menu"
        aria-hidden={!isOpen}
        inert={!isOpen}
        ref={menuRef}
      >
        <button
          className="drawer-close"
          type="button"
          aria-label="Close menu"
          onClick={closeMenu}
        >
          <span />
          <span />
        </button>
        <div className="drawer-primary-links">
          {venueItems.map((item) => (
            <a className="drawer-menu-link drawer-venue-link" href={item.href} key={item.href} onClick={closeMenu}>
              <span className="drawer-link-title">{item.label}</span>
              <span className="drawer-link-detail">{item.detail}</span>
            </a>
          ))}
          {primaryItems.map((item) => (
            <Link
              className="drawer-menu-link"
              href={getMenuHref(basePath, item.href)}
              key={item.href}
              onClick={closeMenu}
            >
              <span className="drawer-link-title">{item.label}</span>
            </Link>
          ))}
          <a className="drawer-menu-link" href={`${basePath || "/"}#updates`} onClick={closeMenu}>
            <span className="drawer-link-title">News &amp; updates</span>
          </a>
        </div>
      </nav>
    </>
  );
}
