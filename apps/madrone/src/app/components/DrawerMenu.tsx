"use client";
import { venue, venuePath } from "@/lib/venue";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { MenuClickTarget } from "@/lib/menuClicksStore";
import LegalLinks from "./LegalLinks";
const menuItems: {
    label: string;
    href: string;
    target: MenuClickTarget;
}[] = [
    { label: "Menu", href: "/menu", target: "menu" },
    { label: "Calendar", href: "/calendar", target: "calendar" },
    { label: "BOOK AN EVENT", href: "/private-events", target: "private-events" },
    { label: "Reservations", href: "/reservations", target: "reservations" },
    { label: "Story", href: "/story", target: "story" },
    { label: "Visit", href: "/visit", target: "visit" },
    { label: "Contact", href: "/contact", target: "contact" },
    { label: "Careers", href: "/careers", target: "careers" },
    { label: "← Home", href: "/", target: "home" },
];
function trackDrawerClick(target: MenuClickTarget) {
    if (typeof window === "undefined")
        return;
    const payload = JSON.stringify({ target, source: "drawer" });
    const url = "/api/track-click";
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(venuePath(url), blob);
            return;
        }
        fetch(venuePath(url), { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => { });
    }
    catch {
        // No-op.
    }
}
type DrawerMenuProps = {
    adaptive?: boolean;
    basePath?: string;
    hideOnDesktop?: boolean;
};
function getMenuHref(basePath: string, href: string) {
    if (href === "/")
        return basePath || "/";
    return `${basePath}${href}`;
}
export default function DrawerMenu({ adaptive = false, basePath = "", hideOnDesktop = false }: DrawerMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hamburgerColor, setHamburgerColor] = useState("var(--brand-primary)");
    const buttonRef = useRef<HTMLButtonElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        document.body.classList.toggle("drawer-open", isOpen);
        return () => document.body.classList.remove("drawer-open");
    }, [isOpen]);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape")
                setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
    useEffect(() => {
        if (hideOnDesktop)
            return;
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
    }, [hideOnDesktop]);
    useEffect(() => {
        if (!adaptive)
            return;
        const getCanvas = () => {
            if (!canvasRef.current)
                canvasRef.current = document.createElement("canvas");
            return canvasRef.current;
        };
        const updateColor = () => {
            if (isOpen) {
                setHamburgerColor("var(--brand-primary)");
                return;
            }
            const button = buttonRef.current;
            const mobileMatch = window.matchMedia("(max-width: 760px)").matches;
            if (!button || !mobileMatch) {
                setHamburgerColor("var(--brand-primary)");
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
                setHamburgerColor("var(--brand-paper)");
                return;
            }
            const imageRect = image.getBoundingClientRect();
            const naturalX = ((centerX - imageRect.left) / imageRect.width) * image.naturalWidth;
            const naturalY = ((centerY - imageRect.top) / imageRect.height) * image.naturalHeight;
            const sampleSize = 24;
            const canvas = getCanvas();
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context)
                return;
            canvas.width = sampleSize;
            canvas.height = sampleSize;
            try {
                context.drawImage(image, naturalX - sampleSize / 2, naturalY - sampleSize / 2, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
                const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
                let luminanceTotal = 0;
                for (let index = 0; index < pixels.length; index += 4) {
                    luminanceTotal +=
                        0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
                }
                setHamburgerColor(luminanceTotal / (pixels.length / 4) < 145 ? "var(--brand-paper)" : "var(--brand-primary)");
            }
            catch {
                setHamburgerColor("var(--brand-paper)");
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
    return (<>
      <button className={`hamburger${hideOnDesktop ? " homepage-hamburger" : ""}${isOpen ? " is-hidden" : ""}`} type="button" aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} aria-controls="site-menu" onClick={() => setIsOpen((value) => !value)} ref={buttonRef} style={{ "--hamburger-color": hamburgerColor } as CSSProperties}>
        <span />
        <span />
        <span />
      </button>

      <nav className={`drawer-menu${hideOnDesktop ? " homepage-drawer" : ""}${isOpen ? " is-open" : ""}`} id="site-menu" aria-label="Site menu" aria-hidden={!isOpen}>
        <div className="venue-drawer-heading"><Link href={basePath || "/"}><img src={venuePath(venue.logo)} alt={venue.name} /></Link>
        <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setIsOpen(false)}>
          <span />
          <span />
        </button></div>
        {menuItems.map((item) => (<Link href={getMenuHref(basePath, item.href)} key={item.href} onClick={() => {
                if (basePath.startsWith("/admin"))
                    return;
                trackDrawerClick(item.target);
            }}>
            {item.label}
          </Link>))}
        <LegalLinks className="legal-links legal-links--drawer"/>
      </nav>
    </>);
}
