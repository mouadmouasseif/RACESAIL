"use client";

import type { Athlete, Competition } from "@/types";
import { getFinishedRaceCount, rankedAthletes } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlagIcon } from "@/components/flag-icon";

function athleteLabel(athlete: Athlete) {
  return `${athlete.firstName} ${athlete.lastName}`;
}

function PodiumList({ title, athletes }: { title: string; athletes: Athlete[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-2">
        {athletes.length ? athletes.slice(0, 3).map((athlete, index) => (
          <div key={athlete.id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant={index === 0 ? "gold" : index === 1 ? "silver" : "bronze"}>{index + 1}</Badge>
              <FlagIcon nationality={athlete.nationality} />
              <span className="truncate font-semibold">{athleteLabel(athlete)}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{athlete.sailNumber}</span>
          </div>
        )) : <p className="text-sm text-muted-foreground">No athletes yet.</p>}
      </CardContent>
    </Card>
  );
}

function YoungestOptimistTrophy({ athlete }: { athlete?: Athlete }) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader><CardTitle className="text-base">Trophee plus jeune Optimist</CardTitle></CardHeader>
      <CardContent>
        {athlete ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="gold">Trophy</Badge>
              <FlagIcon nationality={athlete.nationality} />
              <span className="font-bold text-slate-950">{athleteLabel(athlete)}</span>
            </div>
            <div className="grid gap-1 text-sm text-amber-950">
              <p><span className="font-semibold">Age:</span> {athlete.age} years</p>
              <p><span className="font-semibold">Sail:</span> {athlete.sailNumber}</p>
              <p><span className="font-semibold">Club:</span> {athlete.clubName}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No Optimist athlete found.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryPodiums({ competition }: { competition: Competition }) {
  const rows = rankedAthletes(competition.athletes, competition.raceCount, getFinishedRaceCount(competition.races));
  const categories = Array.from(new Set(rows.map((athlete) => athlete.category).filter(Boolean))).sort();
  const youngestOptimist = rows
    .filter((athlete) => String(athlete.boatClass).toLowerCase().includes("optimist"))
    .sort((a, b) => a.age - b.age || a.rank - b.rank)[0];

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-950">End of regatta podiums</h2>
          <p className="text-sm text-muted-foreground">Top 3 overall, top 3 by category, girls podium and youngest Optimist trophy.</p>
        </div>
        {youngestOptimist ? (
          <Badge variant="success">
            Youngest Optimist: {athleteLabel(youngestOptimist)} - {youngestOptimist.age} years
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <YoungestOptimistTrophy athlete={youngestOptimist} />
        <PodiumList title="OVERALL top 3" athletes={rows} />
        <PodiumList title="GIRLS top 3" athletes={rows.filter((athlete) => athlete.sex === "F")} />
        {categories.map((category) => (
          <PodiumList key={category} title={`${category} top 3`} athletes={rows.filter((athlete) => athlete.category === category)} />
        ))}
      </div>
    </section>
  );
}
