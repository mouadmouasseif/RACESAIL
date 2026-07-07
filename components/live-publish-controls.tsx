"use client";

import { useState } from "react";
import { Copy, Radio, RadioTower, RefreshCw } from "lucide-react";
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
    return `${origin}/competitions/${competition.id}/live`;
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
    const updated = saveLocal({ publicCode: generateCompetitionCode() });
    if (updated) {
      await syncCompetitionToFirestore(updated);
      setMessage("Live code generated.");
    }
  }

  async function publishLive() {
    const updated = saveLocal({ isLivePublished: true });
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
          <Button variant="outline" onClick={unpublishLive}><Radio className="h-4 w-4" /> Unpublish live</Button>
        </div>
        <p className="text-sm text-muted-foreground">Public app: /live. Direct link: {liveUrl()}</p>
        {message ? <p className="text-sm font-medium text-sky-800">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
