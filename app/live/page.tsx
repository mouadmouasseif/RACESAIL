"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { getCompetitionIdByPublicCode } from "@/services/firebaseService";
import LiveResultsClient from "@/app/competitions/[id]/live/LiveResultsClient";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LiveRaceSailPage() {
  const [code, setCode] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLiveResults() {
    setLoading(true);
    setMessage("");
    const id = await getCompetitionIdByPublicCode(code);
    setLoading(false);

    if (!id) {
      setCompetitionId("");
      setMessage("No published competition found for this code.");
      return;
    }

    setCompetitionId(id);
  }

  if (competitionId) return <LiveResultsClient competitionId={competitionId} publicMode />;

  return (
    <PageShell title="Live Race Sail" description="Enter the public competition code shared by the race office.">
      <Card className="mx-auto max-w-xl">
        <CardHeader><CardTitle>Open live results</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Competition code</Label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadLiveResults();
              }}
              placeholder="RACE-2026-ABCD"
              className="font-mono"
            />
          </div>
          <Button onClick={loadLiveResults} disabled={!code.trim() || loading}>
            <Search className="h-4 w-4" />
            {loading ? "Loading..." : "Show live results"}
          </Button>
          {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
