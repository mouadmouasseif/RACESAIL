"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, RotateCcw, Search, Trash2, Unlock } from "lucide-react";
import { penaltyCodes, type Competition, type RacePenaltyCode } from "@/types";
import {
  addAutomaticFinish,
  finishRaceWithDnc,
  findAthleteBySailNumber,
  moveRaceResult,
  openRace,
  recalculateRaceResults,
  removeRaceResult,
  setRacePenalty,
} from "@/lib/raceResultsAuto";
import { raceNumbers } from "@/lib/scoring";
import { sailNumberMatches } from "@/lib/sailNumber";
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

const advancedPenalties = ["UFD", "BFD", "DNC", "DNF", "DNS", "DSQ", "RET", "ZFP", "SCP", "DPI", "RDG"] as const;

export function RaceManagement({ competition, onSaved }: { competition: Competition; onSaved: (competition: Competition) => void }) {
  const [raceNumber, setRaceNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [penaltyCode, setPenaltyCode] = useState<RacePenaltyCode>("UFD");
  const [penaltyPoints, setPenaltyPoints] = useState("");
  const [notes, setNotes] = useState("");
  const race = competition.races.find((item) => item.raceNumber === raceNumber);

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    return competition.athletes.filter((athlete) => sailNumberMatches(search, athlete.sailNumber)).slice(0, 6);
  }, [competition.athletes, search]);

  const raceRows = useMemo(() => {
    return competition.athletes
      .map((athlete) => ({ athlete, result: athlete.results[raceNumber] }))
      .filter((row) => row.result)
      .sort((a, b) => {
        const left = a.result?.finishPosition ?? a.result?.position ?? 9999;
        const right = b.result?.finishPosition ?? b.result?.position ?? 9999;
        if (left !== right) return left - right;
        return a.athlete.sailNumber.localeCompare(b.athlete.sailNumber);
      });
  }, [competition.athletes, raceNumber]);

  function createId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveUpdated(next: Competition, finished = false) {
    const saved = competitionStore.create(next);
    onSaved(saved);
    void syncCompetitionToFirestore(saved);

    if (finished) {
      const notification = {
        id: createId("notification"),
        competitionId: saved.id,
        raceNumber,
        title: `Race ${raceNumber} finished`,
        message: `Race ${raceNumber} finished. Results are now available.`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      competitionStore.notify(saved.id, notification);
      void createRaceNotification(notification);
      showRaceFinishedNotification(notification);
    }
  }

  function addFinish(sailNumber = search) {
    const athlete = findAthleteBySailNumber(competition, sailNumber);
    if (!athlete) return;
    saveUpdated(addAutomaticFinish(competition, raceNumber, athlete.sailNumber));
    setSearch("");
  }

  function addPenalty(sailNumber = search) {
    const athlete = findAthleteBySailNumber(competition, sailNumber);
    if (!athlete) return;
    saveUpdated(setRacePenalty(competition, raceNumber, athlete.sailNumber, penaltyCode, penaltyPoints ? Number(penaltyPoints) : undefined, notes));
    setSearch("");
    setPenaltyPoints("");
    setNotes("");
  }

  function finishRace() {
    saveUpdated(finishRaceWithDnc(competition, raceNumber), true);
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
        <div className="grid gap-4 xl:grid-cols-[170px_1fr_280px_auto] xl:items-end">
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
                className="h-12 pl-9 text-lg font-semibold"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addFinish();
                  if (event.key === "Escape") setSearch("");
                }}
                placeholder="105, MAR 105, mar105"
              />
            </div>
            {matches.length ? (
              <div className="flex flex-wrap gap-2">
                {matches.map((athlete) => (
                  <Button key={athlete.id} variant="secondary" size="sm" onClick={() => addFinish(athlete.sailNumber)}>
                    {athlete.sailNumber} - {athlete.firstName} {athlete.lastName}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Add penalty</Label>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <Select value={penaltyCode} onValueChange={(value) => setPenaltyCode(value as RacePenaltyCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{advancedPenalties.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={penaltyPoints} onChange={(event) => setPenaltyPoints(event.target.value)} placeholder="pts" />
            </div>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => addFinish()}><CheckCircle2 className="h-4 w-4" /> Add finish</Button>
            <Button variant="secondary" onClick={() => addPenalty()}>Add penalty</Button>
            {race?.status === "Finished" ? (
              <Button variant="outline" onClick={() => saveUpdated(openRace(competition, raceNumber))}><Unlock className="h-4 w-4" /> Reopen</Button>
            ) : (
              <Button onClick={finishRace}>Finish race</Button>
            )}
            <Button variant="outline" onClick={() => saveUpdated(recalculateRaceResults(competition, raceNumber))}><RotateCcw className="h-4 w-4" /> Recalculate</Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Position</TableHead>
                <TableHead>Sail Number</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {raceRows.map(({ athlete, result }) => (
                <TableRow key={athlete.id}>
                  <TableCell className="font-bold">{result?.finishPosition ?? result?.position ?? "-"}</TableCell>
                  <TableCell className="font-mono font-semibold">{athlete.sailNumber}</TableCell>
                  <TableCell>{athlete.firstName} {athlete.lastName}</TableCell>
                  <TableCell>{athlete.clubName}</TableCell>
                  <TableCell>
                    <Select value={(result?.penaltyCode ?? (result?.penalty === "OK" ? "NONE" : result?.penalty ?? "NONE")) as string} onValueChange={(value) => saveUpdated(setRacePenalty(competition, raceNumber, athlete.sailNumber, value as RacePenaltyCode))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">NONE</SelectItem>
                        {penaltyCodes.filter((code) => code !== "OK").map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-bold">{result?.points ?? "-"}</TableCell>
                  <TableCell>{result?.notes ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="icon" onClick={() => saveUpdated(moveRaceResult(competition, raceNumber, athlete.sailNumber, -1))}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => saveUpdated(moveRaceResult(competition, raceNumber, athlete.sailNumber, 1))}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => saveUpdated(removeRaceResult(competition, raceNumber, athlete.sailNumber))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!raceRows.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Search a sail number and add the first finisher. The table will grow automatically.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
