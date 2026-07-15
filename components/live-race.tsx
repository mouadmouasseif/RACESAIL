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
import { filterAthletesByBoatClass, getCompetitionBoatClasses, toBoatClassName } from "@/lib/boatClassHelpers";
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
  const boatClassOptions = useMemo(() => getCompetitionBoatClasses(competition), [competition]);
  const [selectedBoatClassId, setSelectedBoatClassId] = useState(() => boatClassOptions[0]?.id ?? "");
  const [liveData, setLiveData] = useState<LiveRaceData>(emptyLiveData);
  const [courseImageUrl, setCourseImageUrl] = useState("");
  const [imageHidden, setImageHidden] = useState(false);
  const selectedBoatClass = boatClassOptions.find((item) => item.id === selectedBoatClassId) ?? boatClassOptions[0];
  const classAthletes = useMemo(
    () => selectedBoatClass ? filterAthletesByBoatClass(competition.athletes, selectedBoatClass.id) : competition.athletes,
    [competition.athletes, selectedBoatClass],
  );
  const scopedCompetition = useMemo(() => ({
    ...competition,
    boatClass: toBoatClassName(selectedBoatClass?.name ?? competition.boatClass),
    athletes: classAthletes,
  }), [classAthletes, competition, selectedBoatClass]);
  const raceId = useMemo(() => liveRaceId(competition.id, raceNumber, selectedBoatClass?.id), [competition.id, raceNumber, selectedBoatClass]);
  const liveState = liveData.state;

  useEffect(() => {
    if (!boatClassOptions.length) return;
    if (!selectedBoatClassId || !boatClassOptions.some((item) => item.id === selectedBoatClassId)) {
      setSelectedBoatClassId(boatClassOptions[0].id);
    }
  }, [boatClassOptions, selectedBoatClassId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const classFromUrl = new URLSearchParams(window.location.search).get("class");
    if (classFromUrl && boatClassOptions.some((item) => item.id === classFromUrl)) {
      setSelectedBoatClassId(classFromUrl);
    }
  }, [boatClassOptions]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function setupLiveRace() {
      if (!selectedBoatClass) return;
      if (!publicMode) {
        const prepared = await ensureLiveRace(competition, raceNumber, selectedBoatClass.id);
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
  }, [competition, publicMode, raceId, raceNumber, selectedBoatClass]);

  const activeFlags = liveState?.activeFlags?.length ? liveState.activeFlags : [];
  const displayImage = liveState?.courseAreaImageUrl || courseImageUrl || "/images/pavillons-depart.jpg";

  function updateLocalLiveState(state: NonNullable<LiveRaceData["state"]>) {
    setLiveData((current) => ({ ...current, state }));
  }

  function mergeScopedCompetition(nextScopedCompetition: Competition) {
    const scopedAthleteIds = new Set(nextScopedCompetition.athletes.map((athlete) => athlete.id));
    const mergedAthletes = competition.athletes.map((athlete) => (
      scopedAthleteIds.has(athlete.id)
        ? nextScopedCompetition.athletes.find((item) => item.id === athlete.id) ?? athlete
        : athlete
    ));
    return {
      ...competition,
      athletes: mergedAthletes,
      races: nextScopedCompetition.races,
      updatedAt: new Date().toISOString(),
    };
  }

  function saveScoped(nextScopedCompetition: Competition) {
    const updated = competitionStore.create(mergeScopedCompetition(nextScopedCompetition));
    onCompetitionSaved?.(updated);
    void syncCompetitionToFirestore(updated);
    return updated;
  }

  async function saveCourseImage() {
    if (!liveState) return;
    await updateLiveRaceState(competition.id, raceId, { courseAreaImageUrl: courseImageUrl.trim() || undefined });
  }

  async function markFinished() {
    if (!liveState) return;
    if (!window.confirm(`Finish ${selectedBoatClass?.name ?? "class"} race ${raceNumber}? Missing boats will become DNC.`)) return;
    saveScoped(finishRaceWithDnc(scopedCompetition, raceNumber));
    await updateLiveRaceState(competition.id, raceId, { status: "finished" });
  }

  async function reopenRace() {
    if (!liveState) return;
    saveScoped(openRace(scopedCompetition, raceNumber));
    await updateLiveRaceState(competition.id, raceId, { status: "open" });
  }

  async function openLiveRace() {
    if (!liveState) return;
    saveScoped(openRace(scopedCompetition, raceNumber));
    await updateLiveRaceState(competition.id, raceId, { status: "open", activeFlags: liveState.activeFlags });
  }

  async function recalculateRace() {
    saveScoped(recalculateRaceResults(scopedCompetition, raceNumber));
  }

  async function copyPublicClassLink() {
    if (!selectedBoatClass || typeof navigator === "undefined") return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://racesail.vercel.app";
    await navigator.clipboard.writeText(`${origin}/live/${competition.id}?class=${encodeURIComponent(selectedBoatClass.id)}`);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">Live Race</h2>
              <Badge variant={liveState?.status === "started" ? "success" : "secondary"}>{liveState?.status ?? "waiting"}</Badge>
              {selectedBoatClass ? <Badge variant="gold">{selectedBoatClass.name}</Badge> : null}
              {liveState?.raceDurationSeconds ? <Badge variant="secondary">Duration {formatRaceTime(liveState.raceDurationSeconds)}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Competition code: <span className="font-mono">{competition.competitionCode || competition.publicCode}</span> · Committee view for start signals, mark rounding, UFD, protests and finish timing.
            </p>
          </div>
          <div className="grid min-w-48 gap-2">
            <Select value={selectedBoatClass?.id ?? ""} onValueChange={setSelectedBoatClassId}>
              <SelectTrigger><SelectValue placeholder="Boat class" /></SelectTrigger>
              <SelectContent>
                {boatClassOptions.map((boatClass) => (
                  <SelectItem key={boatClass.id} value={boatClass.id}>{boatClass.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <Button variant="outline" size="sm" onClick={copyPublicClassLink}>Share class</Button>
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

      <LiveStartTimer competition={scopedCompetition} liveState={liveState} readOnly={publicMode} onStateChange={updateLocalLiveState} />
      <LiveRaceTable competition={scopedCompetition} raceId={raceId} liveState={liveState} liveData={liveData} readOnly={publicMode} onCompetitionSaved={(next) => saveScoped(next)} />
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
