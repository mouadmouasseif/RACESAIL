"use client";

import { useEffect, useState } from "react";
import type { Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { CompetitionNav } from "@/components/competition-nav";
import { PageShell } from "@/components/page-shell";
import { RaceManagement } from "@/components/race-management";
import { ResultsTable } from "@/components/results-table";

export default function ResultsClient({ competitionId }: { competitionId: string }) {
  const [competition, setCompetition] = useState<Competition>();

  useEffect(() => setCompetition(competitionStore.get(competitionId)), [competitionId]);

  if (!competition) return <PageShell title="Competition not found" />;

  return (
    <PageShell title="Race Results" description={`${competition.name} - ${competition.raceCount} race columns`}>
      <CompetitionNav id={competition.id} />
      <div className="grid gap-6">
        <RaceManagement competition={competition} onSaved={setCompetition} />
        <ResultsTable competition={competition} />
      </div>
    </PageShell>
  );
}
