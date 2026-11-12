import type { Metadata } from "next";
import HolderPage from "../../components/HolderPage";
import { currentDevice } from "@/lib/deviceToken";
import { getCurrentContest, getMyVotes, listVoteEntries } from "@/lib/contestStore";
import ContestVote from "./ContestVote";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vote · Costume Contest · The Public Market",
  description: "Vote for your favorite costume at the Public Market.",
};

export default async function ContestVotePage() {
  const contest = await getCurrentContest().catch(() => null);
  const device = contest ? await currentDevice() : null;
  const [results, myVotes] = contest
    ? await Promise.all([listVoteEntries(contest, device?.id ?? null), device ? getMyVotes(contest.id, device.id) : {}])
    : [{ entries: [], winners: [] }, {}];
  return (
    <HolderPage label="contest vote" pageClassName="page--contest">
      <ContestVote contest={contest} entries={results.entries} winners={results.winners} myVotes={myVotes} />
    </HolderPage>
  );
}
