import LiveResultsClient from "./LiveResultsClient";

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveResultsClient competitionId={id} />;
}
