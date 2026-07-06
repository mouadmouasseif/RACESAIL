"use client";

import { useEffect, useState } from "react";
import { boatClasses, type BoatClass, type Competition } from "@/types";
import { createBlankRaces, rankAthletes, shouldApplyDiscard } from "@/lib/scoring";
import { fileToDataUrl } from "@/lib/utils";
import { competitionStore } from "@/services/localStorageService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CompetitionSettings({ competition, onSaved }: { competition: Competition; onSaved: (competition: Competition) => void }) {
  const [name, setName] = useState(competition.name);
  const [clubName, setClubName] = useState(competition.clubName);
  const [location, setLocation] = useState(competition.location);
  const [date, setDate] = useState(competition.date);
  const [boatClass, setBoatClass] = useState<BoatClass>(competition.boatClass);
  const [raceCount, setRaceCount] = useState(competition.raceCount);
  const [clubLogo, setClubLogo] = useState<string | undefined>(competition.clubLogo);
  const [competitionLogo, setCompetitionLogo] = useState<string | undefined>(competition.competitionLogo);

  useEffect(() => {
    setName(competition.name);
    setClubName(competition.clubName);
    setLocation(competition.location);
    setDate(competition.date);
    setBoatClass(competition.boatClass);
    setRaceCount(competition.raceCount);
    setClubLogo(competition.clubLogo);
    setCompetitionLogo(competition.competitionLogo);
  }, [competition]);

  async function handleLogo(fileList: FileList | null, setter: (value: string) => void) {
    const file = fileList?.[0];
    if (file) setter(await fileToDataUrl(file));
  }

  function saveCompetitionSettings() {
    const nextRaceCount = Math.min(9, Math.max(1, Number(raceCount) || 1));
    if (nextRaceCount < competition.raceCount) {
      const hiddenResults = competition.athletes.some((athlete) =>
        Object.keys(athlete.results).some((raceNumber) => Number(raceNumber) > nextRaceCount),
      );
      if (hiddenResults && !window.confirm("Reducing race count will hide later race columns, but the stored results will be preserved. Continue?")) {
        setRaceCount(competition.raceCount);
        return;
      }
    }

    const updated = competitionStore.update(competition.id, (current) => ({
      ...current,
      name: name.trim(),
      clubName: clubName.trim(),
      clubLogo,
      competitionLogo,
      location: location.trim(),
      date,
      boatClass,
      raceCount: nextRaceCount,
      races: createBlankRaces(nextRaceCount, current.races),
      athletes: rankAthletes(
        current.athletes.map((athlete) => ({
          ...athlete,
          boatClass: athlete.boatClass || boatClass,
        })),
        nextRaceCount,
      ),
      updatedAt: new Date().toISOString(),
    }));

    if (updated) onSaved(updated);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Competition settings</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Competition name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Club name</Label>
          <Input value={clubName} onChange={(event) => setClubName(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Location</Label>
          <Input value={location} onChange={(event) => setLocation(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Boat class</Label>
          <Select value={boatClass} onValueChange={(value) => setBoatClass(value as BoatClass)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{boatClasses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Number of races</Label>
          <Input type="number" min={1} max={9} value={raceCount} onChange={(event) => setRaceCount(Number(event.target.value))} />
        </div>
        <div className="grid gap-2">
          <Label>Club logo</Label>
          <Input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files, setClubLogo)} />
        </div>
        <div className="grid gap-2">
          <Label>Competition logo</Label>
          <Input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files, setCompetitionLogo)} />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Badge variant="secondary">Low Point</Badge>
          {shouldApplyDiscard(competition.raceCount) ? <Badge variant="success">Discard active after 4 races</Badge> : <Badge variant="secondary">No discard before 4 races</Badge>}
        </div>
        <div className="md:col-span-2">
          <Button onClick={saveCompetitionSettings}>Save competition changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
