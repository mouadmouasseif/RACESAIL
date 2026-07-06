"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Athlete, Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { rankAthletes } from "@/lib/scoring";
import { createId } from "@/lib/utils";
import { AthleteForm } from "@/components/athlete-form";
import { CompetitionNav } from "@/components/competition-nav";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";

export default function AthletesPage() {
  const params = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition>();
  const [editingAthlete, setEditingAthlete] = useState<Athlete>();

  useEffect(() => setCompetition(competitionStore.get(params.id)), [params.id]);

  if (!competition) return <PageShell title="Competition not found" />;

  function deleteAthlete(athleteId: string) {
    if (!competition || !window.confirm("Delete this athlete? Existing stored race results for this athlete will be removed.")) return;
    const updated = competitionStore.update(competition.id, (current) => {
      const athletes = current.athletes.filter((athlete) => athlete.id !== athleteId);
      return {
        ...current,
        athletes: rankAthletes(athletes, current.raceCount),
        races: current.races.map((race) => ({ ...race, results: race.results.filter((result) => athletes.some((athlete) => athlete.sailNumber === result.sailNumber)) })),
        updatedAt: new Date().toISOString(),
      };
    });
    if (updated) {
      setCompetition(updated);
      if (editingAthlete?.id === athleteId) setEditingAthlete(undefined);
    }
  }

  function duplicateAthlete(athlete: Athlete) {
    if (!competition) return;
    const duplicated: Athlete = {
      ...athlete,
      id: createId("athlete"),
      sailNumber: `${athlete.sailNumber}-copy`,
      results: {},
      total: 0,
      discard: 0,
      net: 0,
      rank: competition.athletes.length + 1,
    };
    const updated = competitionStore.update(competition.id, (current) => ({
      ...current,
      athletes: rankAthletes([...current.athletes, duplicated], current.raceCount),
      updatedAt: new Date().toISOString(),
    }));
    if (updated) setCompetition(updated);
  }

  return (
    <PageShell title="Athletes Management" description={competition.name}>
      <CompetitionNav id={competition.id} />
      <div className="grid gap-6">
        <AthleteForm
          competition={competition}
          editingAthlete={editingAthlete}
          onCancelEdit={() => setEditingAthlete(undefined)}
          onSaved={(updated) => {
            setCompetition(updated);
            setEditingAthlete(undefined);
          }}
        />
        <ResultsTable
          competition={competition}
          onDeleteAthlete={deleteAthlete}
          onEditAthlete={setEditingAthlete}
          onDuplicateAthlete={duplicateAthlete}
          searchable
        />
      </div>
    </PageShell>
  );
}
