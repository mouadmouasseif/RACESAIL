"use client";

import { useEffect, useState } from "react";
import type { Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { getCompetitionFromFirestore } from "@/services/firebaseService";
import { CompetitionNav } from "@/components/competition-nav";
import { PageShell } from "@/components/page-shell";
import { RaceManagement } from "@/components/race-management";
import { ResultsTable } from "@/components/results-table";

export default function ResultsClient({ competitionId }: { competitionId: string }) {
  const [competition, setCompetition] = useState<Competition>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCompetition() {
      setLoading(true);
      try {
        const firebaseCompetition = await getCompetitionFromFirestore(competitionId);
        if (active && firebaseCompetition) {
          competitionStore.create(firebaseCompetition);
          setCompetition(firebaseCompetition);
          return;
        }
      } catch (error) {
        console.error("Firebase results load failed", error);
      } finally {
        if (active) {
          setCompetition((current) => current ?? competitionStore.get(competitionId));
          setLoading(false);
        }
      }
    }

    void loadCompetition();
    return () => {
      active = false;
    };
  }, [competitionId]);

  if (loading) return <PageShell title="Loading race results..." />;
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
