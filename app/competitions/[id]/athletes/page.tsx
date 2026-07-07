"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Athlete, Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { getCompetitionFromFirestore, syncCompetitionToFirestore } from "@/services/firebaseService";
import { getFinishedRaceCount, rankAthletes } from "@/lib/scoring";
import { createId } from "@/lib/utils";
import { AthleteForm } from "@/components/athlete-form";
import { CompetitionNav } from "@/components/competition-nav";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";

export default function AthletesPage() {
  const params = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition>();
  const [editingAthlete, setEditingAthlete] = useState<Athlete>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCompetition() {
      setLoading(true);
      try {
        const firebaseCompetition = await getCompetitionFromFirestore(params.id);
        if (active && firebaseCompetition) {
          competitionStore.create(firebaseCompetition);
          setCompetition(firebaseCompetition);
          return;
        }
      } catch (error) {
        console.error("Firebase athletes load failed", error);
      } finally {
        if (active) {
          setCompetition((current) => current ?? competitionStore.get(params.id));
          setLoading(false);
        }
      }
    }

    void loadCompetition();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) return <PageShell title="Loading athletes..." />;
  if (!competition) return <PageShell title="Competition not found" />;

  function deleteAthlete(athleteId: string) {
    if (!competition || !window.confirm("Delete this athlete? Existing stored race results for this athlete will be removed.")) return;
    const updated = competitionStore.update(competition.id, (current) => {
      const athletes = current.athletes.filter((athlete) => athlete.id !== athleteId);
      return {
        ...current,
        athletes: rankAthletes(athletes, current.raceCount, getFinishedRaceCount(current.races)),
        races: current.races.map((race) => ({ ...race, results: race.results.filter((result) => athletes.some((athlete) => athlete.sailNumber === result.sailNumber)) })),
        updatedAt: new Date().toISOString(),
      };
    });
    if (updated) {
      setCompetition(updated);
      void syncCompetitionToFirestore(updated);
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
      athletes: rankAthletes([...current.athletes, duplicated], current.raceCount, getFinishedRaceCount(current.races)),
      updatedAt: new Date().toISOString(),
    }));
    if (updated) {
      setCompetition(updated);
      void syncCompetitionToFirestore(updated);
    }
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
            void syncCompetitionToFirestore(updated);
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
