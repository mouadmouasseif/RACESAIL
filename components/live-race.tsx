"use client";

import { useEffect, useMemo, useState } from "react";
import type { Competition } from "@/types";
import {
  finishRaceWithDnc,
  openRace,
  recalculateRaceResults,
} from "@/lib/raceResultsAuto";
import {
  ensureLiveRace,
  formatRaceTime,
  liveRaceId,
  subscribeLiveRaceData,
  updateLiveRaceState,
  type LiveRaceData,
} from "@/lib/raceLive";
import { competitionStore } from "@/services/localStorageService";
import { syncCompetitionToFirestore } from "@/services/firebaseService";
import { LiveRaceTable } from "@/components/LiveRaceTable";
import { LiveStartTimer } from "@/components/LiveStartTimer";
import { ProtestForm } from "@/components/ProtestForm";
import { SailingFlag } from "@/components/SailingFlag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyLiveData: LiveRaceData = {
  marks: [],
  ufd: [],
  protests: [],
  startList: [],
};

export function LiveRace({ competition, publicMode = false, onCompetitionSaved }: { competition: Competition; publicMode?: boolean; onCompetitionSaved?: (competition: Competition) => void }) {
  const [raceNumber, setRaceNumber] = useState(1);
  const [liveData, setLiveData] = useState<LiveRaceData>(emptyLiveData);
  const [courseImageUrl, setCourseImageUrl] = useState("");
  const [imageHidden, setImageHidden] = useState(false);
  const raceId = useMemo(() => liveRaceId(competition.id, raceNumber), [competition.id, raceNumber]);
  const liveState = liveData.state;

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function setupLiveRace() {
      if (!publicMode) {
        const prepared = await ensureLiveRace(competition, raceNumber);
        if (active) setLiveData(prepared);
      }

      unsubscribe = await subscribeLiveRaceData(competition.id, raceId, (data) => {
        if (!active) return;
        setLiveData({ ...emptyLiveData, ...data });
        setCourseImageUrl(data.state?.courseAreaImageUrl ?? "");
      });
    }

    void setupLiveRace();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [competition, publicMode, raceId, raceNumber]);

  const activeFlags = liveState?.activeFlags?.length ? liveState.activeFlags : [];
  const displayImage = liveState?.courseAreaImageUrl || courseImageUrl || "/images/pavillons-depart.jpg";

  async function saveCourseImage() {
    if (!liveState) return;
    await updateLiveRaceState(competition.id, raceId, { courseAreaImageUrl: courseImageUrl.trim() || undefined });
  }

  async function markFinished() {
    if (!liveState) return;
    const updated = competitionStore.create(finishRaceWithDnc(competition, raceNumber));
    onCompetitionSaved?.(updated);
    void syncCompetitionToFirestore(updated);
    await updateLiveRaceState(competition.id, raceId, { status: "finished" });
  }

  async function reopenRace() {
    if (!liveState) return;
    const updated = competitionStore.create(openRace(competition, raceNumber));
    onCompetitionSaved?.(updated);
    void syncCompetitionToFirestore(updated);
    await updateLiveRaceState(competition.id, raceId, { status: "open" });
  }

  async function openLiveRace() {
    if (!liveState) return;
    const updated = competitionStore.create(openRace(competition, raceNumber));
    onCompetitionSaved?.(updated);
    void syncCompetitionToFirestore(updated);
    await updateLiveRaceState(competition.id, raceId, { status: "open", activeFlags: liveState.activeFlags });
  }

  async function recalculateRace() {
    const updated = competitionStore.create(recalculateRaceResults(competition, raceNumber));
    onCompetitionSaved?.(updated);
    void syncCompetitionToFirestore(updated);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">Live Race</h2>
              <Badge variant={liveState?.status === "started" ? "success" : "secondary"}>{liveState?.status ?? "waiting"}</Badge>
              {liveState?.raceDurationSeconds ? <Badge variant="secondary">Duration {formatRaceTime(liveState.raceDurationSeconds)}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Committee view for start signals, mark rounding, UFD, protests and finish timing.
            </p>
          </div>
          <div className="grid min-w-48 gap-2">
            <Select value={String(raceNumber)} onValueChange={(value) => setRaceNumber(Number(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: competition.raceCount }, (_, index) => index + 1).map((race) => (
                  <SelectItem key={race} value={String(race)}>Race {race}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!publicMode ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openLiveRace}>Open Race</Button>
                <Button variant="secondary" size="sm" onClick={markFinished}>Finish race</Button>
                <Button variant="outline" size="sm" onClick={reopenRace}>Reopen</Button>
                <Button variant="outline" size="sm" onClick={recalculateRace}>Recalculate</Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Active flags</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {activeFlags.length ? activeFlags.map((flag) => <SailingFlag key={flag} code={flag} size="md" showLabel />) : <span className="text-sm text-slate-300">No active flag</span>}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-slate-50">
            {!imageHidden && displayImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImage} alt="Competition area" className="h-44 w-full object-cover" onError={() => setImageHidden(true)} />
            ) : (
              <div className="grid h-44 place-items-center text-sm text-muted-foreground">Course area image optional</div>
            )}
          </div>
        </div>

        {!publicMode ? (
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
            <Input
              value={courseImageUrl}
              onChange={(event) => {
                setImageHidden(false);
                setCourseImageUrl(event.target.value);
              }}
              placeholder="Course area image URL"
            />
            <Button variant="outline" onClick={saveCourseImage}>Save image</Button>
          </div>
        ) : null}
      </section>

      <LiveStartTimer competition={competition} liveState={liveState} readOnly={publicMode} />
      <LiveRaceTable competition={competition} raceId={raceId} liveState={liveState} liveData={liveData} readOnly={publicMode} onCompetitionSaved={onCompetitionSaved} />
      {!publicMode ? <ProtestForm competitionId={competition.id} raceId={raceId} /> : null}

      {liveData.protests.length ? (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Race protests</h2>
          <div className="mt-3 grid gap-2">
            {liveData.protests.map((protest) => (
              <div key={protest.id} className="rounded-md border p-3 text-sm">
                <span className="font-semibold">{protest.protesterSailNumber}</span>
                <span className="px-2 text-muted-foreground">vs</span>
                <span className="font-semibold">{protest.protestedSailNumber}</span>
                {protest.witnessSailNumber ? <span className="ml-3 text-muted-foreground">Witness {protest.witnessSailNumber}</span> : null}
                <Badge className="ml-3" variant="secondary">{protest.status}</Badge>
                {protest.reason ? <p className="mt-1 text-muted-foreground">{protest.reason}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
