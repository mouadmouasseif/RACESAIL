"use client";

import { useState } from "react";
import { Copy, Files, Radio, RadioTower, RefreshCw } from "lucide-react";
import type { Competition } from "@/types";
import { generateCompetitionCode } from "@/lib/utils";
import { competitionStore } from "@/services/localStorageService";
import { publishCompetitionLive, syncCompetitionToFirestore, unpublishCompetitionLive } from "@/services/firebaseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LivePublishControls({ competition, onSaved }: { competition: Competition; onSaved: (competition: Competition) => void }) {
  const [message, setMessage] = useState("");

  function liveUrl() {
    const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://racesail.vercel.app");
    return `${origin}/live/${competition.id}`;
  }

  function joinUrl() {
    const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://racesail.vercel.app");
    return `${origin}/join`;
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied.`);
    } catch {
      window.prompt(`Copy ${label}`, text);
    }
  }

  function saveLocal(patch: Partial<Competition>) {
    const updated = competitionStore.update(competition.id, (current) => ({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
    if (updated) onSaved(updated);
    return updated;
  }

  async function generateCode() {
    const code = generateCompetitionCode();
    const updated = saveLocal({ publicCode: code, competitionCode: code, publicAccessEnabled: true, allowedRoles: ["coach", "athlete"] });
    if (updated) {
      await syncCompetitionToFirestore(updated);
      setMessage("Live code generated.");
    }
  }

  async function publishLive() {
    const updated = saveLocal({ isLivePublished: true, publicAccessEnabled: true });
    if (!updated) return;
    const ok = await publishCompetitionLive(updated);
    setMessage(ok ? "Live results published." : "Unable to publish live results.");
  }

  async function unpublishLive() {
    const ok = await unpublishCompetitionLive(competition);
    if (ok) {
      const updated = saveLocal({ isLivePublished: false });
      if (updated) onSaved(updated);
    }
    setMessage(ok ? "Live results unpublished." : "Unable to unpublish live results.");
  }

  function duplicateCompetition(copyAthletes: boolean) {
    const now = new Date().toISOString();
    const code = generateCompetitionCode();
    const duplicated: Competition = {
      ...competition,
      id: `competition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${competition.name} copy`,
      publicCode: code,
      competitionCode: code,
      publicAccessEnabled: false,
      isLivePublished: false,
      originalCompetitionId: competition.id,
      athletes: copyAthletes ? competition.athletes.map((athlete) => ({ ...athlete, results: {}, total: 0, discard: 0, net: 0, rank: 0 })) : [],
      races: competition.races.map((race) => ({ ...race, status: "Draft", results: [], updatedAt: now })),
      notifications: [],
      createdAt: now,
      updatedAt: now,
    };
    competitionStore.create(duplicated);
    window.location.href = `/competitions/${duplicated.id}`;
  }

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>Live Race Sail sharing</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={competition.isLivePublished ? "success" : "secondary"}>
            {competition.isLivePublished ? "Published" : "Not published"}
          </Badge>
          <span className="font-mono text-sm font-semibold">{competition.publicCode}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateCode}><RefreshCw className="h-4 w-4" /> Generate live code</Button>
          <Button onClick={publishLive}><RadioTower className="h-4 w-4" /> Publish live results</Button>
          <Button variant="secondary" onClick={() => copy(liveUrl(), "live link")}><Copy className="h-4 w-4" /> Copy live link</Button>
          <Button variant="secondary" onClick={() => copy(competition.publicCode, "live code")}><Copy className="h-4 w-4" /> Copy live code</Button>
          <Button variant="secondary" onClick={() => copy(competition.competitionCode || competition.publicCode, "competition code")}><Copy className="h-4 w-4" /> Partager avec code</Button>
          <Button variant="secondary" onClick={() => copy(joinUrl(), "join link")}><Copy className="h-4 w-4" /> Copy join link</Button>
          <Button variant="outline" onClick={unpublishLive}><Radio className="h-4 w-4" /> Unpublish live</Button>
          <Button variant="outline" onClick={() => duplicateCompetition(false)}><Files className="h-4 w-4" /> Duplicate competition</Button>
          <Button variant="outline" onClick={() => duplicateCompetition(true)}><Files className="h-4 w-4" /> Duplicate + athletes</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Code competition: <span className="font-mono font-semibold">{competition.competitionCode || competition.publicCode}</span> آ· Join: {joinUrl()} آ· Direct live: {liveUrl()}
        </p>
        {message ? <p className="text-sm font-medium text-sky-800">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
