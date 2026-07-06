"use client";

import { useEffect, useState } from "react";
import type { Competition } from "@/types";
import { rankAthletes } from "@/lib/scoring";
import { isFirebaseConfigured, migrateFirebaseAthlete, subscribeToLiveCompetition } from "@/services/firebaseService";
import { LiveActions } from "@/components/live-actions";
import { NotificationPanel } from "@/components/notification-panel";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";

export default function LiveResultsClient({ competitionId }: { competitionId: string }) {
  const [competition, setCompetition] = useState<Competition>();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (isFirebaseConfigured()) {
      void subscribeToLiveCompetition(competitionId, (payload) => {
        if (!payload.competition) return;
        const raceCount = Number(payload.competition.raceCount) || 1;
        const athletes = payload.athletes.map((athlete) => ({
          ...migrateFirebaseAthlete(athlete),
          results: Object.fromEntries(
            payload.results
              .filter((result) => result.sailNumber === athlete.sailNumber)
              .map((result) => [result.raceNumber, result]),
          ),
        }));

        setCompetition({
          ...payload.competition,
          id: competitionId,
          name: payload.competition.name ?? "Live Competition",
          clubName: payload.competition.clubName ?? "",
          location: payload.competition.location ?? "",
          date: payload.competition.date ?? new Date().toISOString().slice(0, 10),
          boatClass: payload.competition.boatClass ?? "Optimist",
          raceCount,
          scoringSystem: "Low Point",
          athletes: rankAthletes(athletes, raceCount),
          races: payload.races,
          notifications: payload.notifications,
          createdAt: payload.competition.createdAt ?? new Date().toISOString(),
          updatedAt: payload.competition.updatedAt ?? new Date().toISOString(),
        } as Competition);
      }).then((cleanup) => {
        unsubscribe = cleanup;
      });
    }

    return () => unsubscribe?.();
  }, [competitionId]);

  if (!competition) {
    return <PageShell title="Live results" description="No live competition data is available yet." />;
  }

  return (
    <PageShell title={`${competition.name} live results`} description={`${competition.clubName} · ${competition.location}`} actions={<LiveActions competitionId={competition.id} />}>
      <div className="grid gap-6">
        <NotificationPanel notifications={competition.notifications ?? []} />
        <ResultsTable competition={competition} />
      </div>
    </PageShell>
  );
}
