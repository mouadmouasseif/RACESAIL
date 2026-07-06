"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RotateCcw } from "lucide-react";
import type { Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { CompetitionCard } from "@/components/competition-card";
import { StatCard } from "@/components/stat-card";
import InstallAppButton from "@/components/install-app-button";

export default function DashboardPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    setCompetitions(competitionStore.list());
    const sync = () => setCompetitions(competitionStore.list());
    window.addEventListener("raceSail:storage", sync);
    return () => window.removeEventListener("raceSail:storage", sync);
  }, []);

  const athleteCount = competitions.reduce((sum, competition) => sum + competition.athletes.length, 0);
  const raceCount = competitions.reduce((sum, competition) => sum + competition.raceCount, 0);
  function removeCompetition(id: string) {
    if (!window.confirm("Delete this competition and all stored local results?")) return;
    competitionStore.delete(id);
    setCompetitions(competitionStore.list());
  }

  return (
    <PageShell
      title="Sailing competitions dashboard"
      description="Create regattas, manage athletes, enter race results, and export professional score sheets."
      actions={
        <>
          <InstallAppButton />
          <Button asChild className="bg-white text-sky-900 hover:bg-sky-50">
            <Link href="/competitions/new"><Plus className="h-4 w-4" /> Create Competition</Link>
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Competitions" value={competitions.length} />
        <StatCard label="Athletes" value={athleteCount} />
        <StatCard label="Configured races" value={raceCount} />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-950">All competitions</h2>
        <Button variant="ghost" size="sm" onClick={() => { competitionStore.resetDemo(); setCompetitions(competitionStore.list()); }}>
          <RotateCcw className="h-4 w-4" /> Reset demo
        </Button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {competitions.map((competition) => (
          <div key={competition.id} className="grid gap-2">
            <CompetitionCard competition={competition} />
            <Button variant="ghost" size="sm" className="justify-self-start text-red-700 hover:text-red-800" onClick={() => removeCompetition(competition.id)}>
              Delete competition
            </Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
