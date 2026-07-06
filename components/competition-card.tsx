"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Users, Waves } from "lucide-react";
import type { Competition } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoImage } from "@/components/logo-image";

export function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link href={`/competitions/${competition.id}`}>
      <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-soft">
        <div className="h-2 bg-gradient-to-r from-sky-700 via-cyan-500 to-teal-400" />
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <LogoImage src={competition.clubLogo} alt={`${competition.clubName} logo`} />
              <div className="min-w-0">
                <CardTitle className="truncate text-xl">{competition.name}</CardTitle>
                <p className="mt-1 truncate text-sm text-muted-foreground">{competition.clubName}</p>
              </div>
            </div>
            <LogoImage src={competition.competitionLogo} alt={`${competition.name} logo`} className="h-10 w-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="flex items-center gap-2"><Waves className="h-4 w-4 text-cyan-700" />{competition.boatClass}</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-700" />{competition.athletes.length} athletes</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-700" />{new Date(competition.date).toLocaleDateString()}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-700" />{competition.location}</div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <Badge variant="secondary">{competition.raceCount} races</Badge>
            <Badge variant={competition.races.some((race) => race.status === "Finished") ? "success" : "default"}>
              {competition.races.some((race) => race.status === "Finished") ? "Active" : "Draft"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
