import LiveResultsClient from "@/app/competitions/[id]/live/LiveResultsClient";

export default async function PublicCompetitionLivePage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;
  return <LiveResultsClient competitionId={competitionId} publicMode />;
}
