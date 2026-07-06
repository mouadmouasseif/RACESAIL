"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { CompetitionNav } from "@/components/competition-nav";
import { CompetitionSettings } from "@/components/competition-settings";
import { LogoImage } from "@/components/logo-image";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompetitionDetailPage() {
  const params = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition>();

  useEffect(() => setCompetition(competitionStore.get(params.id)), [params.id]);

  if (!competition) return <PageShell title="Competition not found" description="Return to the dashboard and choose a competition." />;

  return (
    <PageShell title={competition.name} description={`${competition.clubName} · ${competition.location}`}>
      <CompetitionNav id={competition.id} />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Athletes" value={competition.athletes.length} />
        <StatCard label="Races" value={competition.raceCount} />
        <StatCard label="Boat class" value={competition.boatClass} />
        <StatCard label="Net scoring" value={competition.raceCount >= 4 ? "Discard on" : "No discard"} />
      </div>
      <div className="mb-6">
        <CompetitionSettings competition={competition} onSaved={setCompetition} />
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Competition profile</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="flex items-center gap-4"><LogoImage src={competition.clubLogo} alt="Club logo" /><div><p className="font-semibold">{competition.clubName}</p><p className="text-sm text-muted-foreground">Club logo</p></div></div>
          <div className="flex items-center gap-4"><LogoImage src={competition.competitionLogo} alt="Competition logo" /><div><p className="font-semibold">{competition.name}</p><p className="text-sm text-muted-foreground">Competition logo</p></div></div>
          <p><Badge variant="secondary">Low Point system</Badge></p>
          <p className="text-sm text-muted-foreground">Date: {new Date(competition.date).toLocaleDateString()}</p>
        </CardContent>
      </Card>
      <ResultsTable competition={competition} />
    </PageShell>
  );
}
