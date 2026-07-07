"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, Save, Unlock } from "lucide-react";
import { penaltyCodes, type Competition, type PenaltyCode, type RaceResult, type RaceStatus } from "@/types";
import { createBlankRaces, getFinishedRaceCount, makeRaceResult, raceNumbers, rankAthletes } from "@/lib/scoring";
import { competitionStore } from "@/services/localStorageService";
import { createRaceNotification, syncCompetitionToFirestore } from "@/services/firebaseService";
import { showRaceFinishedNotification } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DraftResult = {
  position: string;
  penalty: PenaltyCode;
  notes: string;
};

export function RaceManagement({ competition, onSaved }: { competition: Competition; onSaved: (competition: Competition) => void }) {
  const [raceNumber, setRaceNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [highlightedSail, setHighlightedSail] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DraftResult>>({});
  const race = competition.races.find((item) => item.raceNumber === raceNumber);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return competition.athletes.filter((athlete) => !query || athlete.sailNumber.toLowerCase().includes(query));
  }, [competition.athletes, search]);

  function draftKey(sailNumber: string) {
    return `${raceNumber}:${sailNumber}`;
  }

  function getDraft(sailNumber: string): DraftResult {
    const existing = competition.athletes.find((athlete) => athlete.sailNumber === sailNumber)?.results[raceNumber];
    return drafts[draftKey(sailNumber)] ?? {
      position: existing?.position ? String(existing.position) : "",
      penalty: existing?.penalty ?? "OK",
      notes: existing?.notes ?? "",
    };
  }

  function updateDraft(sailNumber: string, patch: Partial<DraftResult>) {
    setDrafts((current) => ({ ...current, [draftKey(sailNumber)]: { ...getDraft(sailNumber), ...patch } }));
  }

  function selectFirstSearchResult() {
    const target = rows[0];
    if (!target) return;
    setHighlightedSail(target.sailNumber);
    window.setTimeout(() => {
      document.getElementById(`race-row-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(`race-position-${target.id}`)?.focus();
    }, 0);
  }

  function createId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveRace(status?: RaceStatus) {
    const updated = competitionStore.update(competition.id, (current) => {
      const resultsBySail = new Map<string, RaceResult>();

      current.athletes.forEach((athlete) => {
        const draft = getDraft(athlete.sailNumber);
        const existing = athlete.results[raceNumber];
        if (!draft.position && draft.penalty === "OK" && !existing) return;
        const result = makeRaceResult({
          raceNumber,
          sailNumber: athlete.sailNumber,
          position: draft.penalty === "OK" && draft.position ? Number(draft.position) : undefined,
          penalty: draft.penalty,
          notes: draft.notes,
          athleteCount: current.athletes.length,
        });
        resultsBySail.set(athlete.sailNumber, result);
      });

      const athletesWithResults = current.athletes.map((athlete) => ({
        ...athlete,
        results: resultsBySail.has(athlete.sailNumber)
          ? { ...athlete.results, [raceNumber]: resultsBySail.get(athlete.sailNumber)! }
          : athlete.results,
      }));

      const races = createBlankRaces(current.raceCount, current.races).map((item) => {
        if (item.raceNumber !== raceNumber) return item;
        const nextStatus = status ?? (item.status === "Finished" ? "Corrected" : item.status);
        return {
          ...item,
          status: nextStatus,
          results: athletesWithResults.map((athlete) => athlete.results[raceNumber]).filter(Boolean),
          updatedAt: new Date().toISOString(),
        };
      });
      const athletes = rankAthletes(
        athletesWithResults,
        current.raceCount,
        getFinishedRaceCount(races),
      );

      return { ...current, athletes, races, updatedAt: new Date().toISOString() };
    });

    if (updated) {
      onSaved(updated);
      setDrafts({});
      void syncCompetitionToFirestore(updated);
      if (status === "Finished") {
        const notification = {
          id: createId("notification"),
          competitionId: competition.id,
          raceNumber,
          title: `Race ${raceNumber} finished`,
          message: `Race ${raceNumber} finished. Results are now available.`,
          createdAt: new Date().toISOString(),
          read: false,
        };
        competitionStore.notify(competition.id, notification);
        void createRaceNotification(notification);
        showRaceFinishedNotification(notification);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Race management</CardTitle>
          <Badge variant={race?.status === "Finished" ? "success" : race?.status === "Corrected" ? "gold" : "secondary"}>
            {race?.status ?? "Draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[180px_1fr_auto_auto] md:items-end">
          <div className="grid gap-2">
            <Label>Race number</Label>
            <Select value={String(raceNumber)} onValueChange={(value) => setRaceNumber(Number(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{raceNumbers(competition.raceCount).map((number) => <SelectItem key={number} value={String(number)}>Race {number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Search sail number</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") selectFirstSearchResult();
                  if (event.key === "Escape") setSearch("");
                }}
                placeholder="Sail Number"
              />
            </div>
          </div>
          <Button variant="secondary" onClick={() => saveRace("Draft")}><Save className="h-4 w-4" /> Save race</Button>
          {race?.status === "Finished" ? (
            <Button variant="outline" onClick={() => saveRace("Corrected")}><Unlock className="h-4 w-4" /> Reopen</Button>
          ) : (
            <Button onClick={() => saveRace("Finished")}><CheckCircle2 className="h-4 w-4" /> Mark finished</Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Sail number</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Finish position</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((athlete) => {
                const draft = getDraft(athlete.sailNumber);
                return (
                  <TableRow id={`race-row-${athlete.id}`} key={athlete.id} className={highlightedSail === athlete.sailNumber ? "bg-sky-100" : undefined}>
                    <TableCell className="font-mono font-semibold">{athlete.sailNumber}</TableCell>
                    <TableCell>{athlete.firstName} {athlete.lastName}</TableCell>
                    <TableCell><Input id={`race-position-${athlete.id}`} type="number" min={1} value={draft.position} disabled={draft.penalty !== "OK"} onChange={(event) => updateDraft(athlete.sailNumber, { position: event.target.value })} /></TableCell>
                    <TableCell>
                      <Select value={draft.penalty} onValueChange={(value) => updateDraft(athlete.sailNumber, { penalty: value as PenaltyCode })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{penaltyCodes.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={draft.notes} onChange={(event) => updateDraft(athlete.sailNumber, { notes: event.target.value })} placeholder="Optional" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
