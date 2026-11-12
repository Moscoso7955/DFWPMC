import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HolderPage from "../../components/HolderPage";
import { getLiveNight } from "@/lib/photoStore";
import PhotoStream from "./PhotoStream";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!process.env.POSTGRES_URL) return { title: "Photos · The Public Market" };
  const { date } = await params;
  const night = await getLiveNight(date).catch(() => null);
  if (!night) return { title: "Photos · The Public Market" };
  const title = `${night.title} · The Public Market`;
  const description = `${night.photos.length} photos from ${longDate(night.date)} at the Public Market. Free to download.`;
  const image = night.photos[0]?.view;
  return {
    title,
    description,
    openGraph: { title, description, url: `https://fwpublicmarket.com/photos/${date}`, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function NightPhotosPage({ params }: Props) {
  if (!process.env.POSTGRES_URL) notFound();
  const { date } = await params;
  const night = await getLiveNight(date);
  if (!night) notFound();
  return (
    <HolderPage label="photos" pageClassName="page--photos">
      <PhotoStream title={night.title} when={longDate(night.date)} by={night.by} date={night.path} photos={night.photos} />
    </HolderPage>
  );
}
