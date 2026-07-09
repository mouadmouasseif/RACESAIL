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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function JoinCompetitionPage() {
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"coach" | "athlete">("athlete");
  const [competitionId, setCompetitionId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function joinCompetition() {
    setLoading(true);
    setMessage("");
    const id = await getCompetitionIdByPublicCode(code);
    setLoading(false);
    if (!id) {
      setMessage("Code competition invalide ou non publie.");
      return;
    }
    setCompetitionId(id);
  }

  if (competitionId) return <LiveResultsClient competitionId={competitionId} publicMode />;

  return (
    <PageShell title="Join RaceSail" description="Enter the competition code shared by the race office.">
      <Card className="mx-auto max-w-xl">
        <CardHeader><CardTitle>Access competition</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "coach" | "athlete")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="athlete">Athlete - live and ranking</SelectItem>
                <SelectItem value="coach">Coach - live, ranking and exports</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Competition code</Label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") void joinCompetition();
              }}
              placeholder="FNIR2026, OPTI2026, RACE-8X4K"
              className="font-mono text-lg font-semibold"
            />
          </div>
          <Button onClick={joinCompetition} disabled={!code.trim() || loading}>
            <Search className="h-4 w-4" />
            {loading ? "Loading..." : `Join as ${role}`}
          </Button>
          {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
