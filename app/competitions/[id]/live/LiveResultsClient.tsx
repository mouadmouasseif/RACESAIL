"use client";

import { useEffect, useState } from "react";
import type { Competition } from "@/types";
import { getFinishedRaceCount, rankAthletes } from "@/lib/scoring";
import { isFirebaseConfigured, migrateFirebaseAthlete, subscribeToLiveCompetition } from "@/services/firebaseService";
import { competitionStore } from "@/services/localStorageService";
import { LiveActions } from "@/components/live-actions";
import { LiveRace } from "@/components/live-race";
import { NotificationPanel } from "@/components/notification-panel";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";

export default function LiveResultsClient({ competitionId, publicMode = false }: { competitionId: string; publicMode?: boolean }) {
  const [competition, setCompetition] = useState<Competition>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const localCompetition = competitionStore.get(competitionId);
    if (localCompetition) setCompetition(localCompetition);

    if (isFirebaseConfigured()) {
      void subscribeToLiveCompetition(competitionId, (payload) => {
        if (!payload.competition) {
          setLoading(false);
          return;
        }
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
        const liveCompetition = {
          ...payload.competition,
          id: competitionId,
          publicCode: payload.competition.publicCode ?? "",
          competitionCode: payload.competition.competitionCode ?? payload.competition.publicCode ?? "",
          publicAccessEnabled: payload.competition.publicAccessEnabled ?? payload.competition.isLivePublished ?? false,
          allowedRoles: payload.competition.allowedRoles ?? ["coach", "athlete"],
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
        } as Competition;
        competitionStore.create(liveCompetition);
        setCompetition(liveCompetition);
        setLoading(false);
      }).then((cleanup) => {
        unsubscribe = cleanup;
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, [competitionId]);

  if (loading && !competition) {
    return <PageShell title="Live Race Sail" description="Loading live race control..." />;
  }

  if (!competition) {
    return <PageShell title="Live Race Sail" description={publicMode ? "No published live data is available yet." : "Competition not found locally. Open the competition overview first or sync Firebase."} />;
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
        {!publicMode ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <p className="font-bold">Live Race Digital control</p>
            <p className="mt-1">
              Utilisation rapide: choisir la manche, cliquer Open Race, chercher le numero de voile, puis Finish ou UFD.
              Chaque Finish remplit automatiquement la table Results avec les positions 1, 2, 3...
            </p>
          </div>
        ) : null}
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
