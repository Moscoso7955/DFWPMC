import type { Metadata } from "next";
import HolderPage from "../components/HolderPage";
import { currentDevice } from "@/lib/deviceToken";
import { getCurrentContest, getMyEntry } from "@/lib/contestStore";
import { isPhotoStorageConfigured } from "@/lib/r2";
import ContestEnter from "./ContestEnter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Costume Contest · The Public Market",
  description: "Enter your costume and vote for your favorite at the Public Market.",
};

// fwpublicmarket.com/contest always shows whichever photo event is on, so the
// same printed QR code works for every one.
export default async function ContestPage() {
  const contest = await getCurrentContest().catch(() => null);
  const device = contest ? await currentDevice() : null;
  const mine = contest && device ? await getMyEntry(contest.id, device.id) : null;
  return (
    <HolderPage label="contest" pageClassName="page--contest">
      <ContestEnter contest={contest} mine={mine} storageReady={isPhotoStorageConfigured()} />
    </HolderPage>
  );
}
