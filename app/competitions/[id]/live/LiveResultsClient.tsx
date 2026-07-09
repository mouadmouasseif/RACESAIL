"use client";

import { useEffect, useState } from "react";
import type { Competition } from "@/types";
import { getFinishedRaceCount, rankAthletes } from "@/lib/scoring";
import { isFirebaseConfigured, migrateFirebaseAthlete, subscribeToLiveCompetition } from "@/services/firebaseService";
import { LiveActions } from "@/components/live-actions";
import { LiveRace } from "@/components/live-race";
import { NotificationPanel } from "@/components/notification-panel";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";

export default function LiveResultsClient({ competitionId, publicMode = false }: { competitionId: string; publicMode?: boolean }) {
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

        const finishedRaceCount = getFinishedRaceCount(payload.races);
        setCompetition({
          ...payload.competition,
          id: competitionId,
          publicCode: payload.competition.publicCode ?? "",
          isLivePublished: payload.competition.isLivePublished ?? false,
          name: payload.competition.name ?? "Live Competition",
          clubName: payload.competition.clubName ?? "",
          location: payload.competition.location ?? "",
          date: payload.competition.date ?? new Date().toISOString().slice(0, 10),
          boatClass: payload.competition.boatClass ?? "Optimist",
          raceCount,
          scoringSystem: "Low Point",
          athletes: rankAthletes(athletes, raceCount, finishedRaceCount),
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
    return <PageShell title="Live Race Sail" description="No live competition data is available yet." />;
  }

  if (publicMode && !competition.isLivePublished) {
    return <PageShell title="Live Race Sail" description="This competition is not published yet." />;
  }

  return (
    <PageShell
      title={publicMode ? "Live Race Sail" : `${competition.name} live results`}
      description={`${competition.name} - ${competition.location}`}
      actions={publicMode ? null : <LiveActions competitionId={competition.id} />}
    >
      <div className="grid gap-6">
        <NotificationPanel notifications={competition.notifications ?? []} />
        <LiveRace competition={competition} publicMode={publicMode} onCompetitionSaved={setCompetition} />
        <div className="grid gap-3 md:grid-cols-3">
          {competition.races.slice(0, competition.raceCount).map((race) => (
            <div key={race.raceNumber} className="rounded-lg border bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Race {race.raceNumber}</p>
              <p className="text-sm text-muted-foreground">Status: {race.status}</p>
              <p className="text-xs text-muted-foreground">Results: {race.results.length}</p>
            </div>
          ))}
        </div>
        <ResultsTable competition={competition} />
      </div>
    </PageShell>
  );
}
