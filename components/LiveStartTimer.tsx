"use client";

import { useEffect, useMemo, useState } from "react";
import type { Competition, RaceLiveState, StartCountdownMode } from "@/types";
import { countdownSecondsForMode, updateLiveRaceState } from "@/lib/raceLive";
import { getClassFlagCode } from "@/lib/sailingFlags";
import { SailingFlag } from "@/components/SailingFlag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LiveStartTimerProps = {
  competition: Competition;
  liveState?: RaceLiveState;
  readOnly?: boolean;
};

function formatCountdown(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remaining = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function remainingSeconds(liveState?: RaceLiveState) {
  if (!liveState) return 0;
  if (liveState.status !== "countdown" || !liveState.countdownStartedAt) return liveState.countdownSeconds;
  const elapsed = Math.floor((Date.now() - liveState.countdownStartedAt) / 1000);
  return Math.max(0, liveState.countdownSeconds - elapsed);
}

export function LiveStartTimer({ competition, liveState, readOnly = false }: LiveStartTimerProps) {
  const [mode, setMode] = useState<StartCountdownMode>(liveState?.countdownMode ?? "5min");
  const [preparatoryFlag, setPreparatoryFlag] = useState(liveState?.selectedFlagCode ?? "P");
  const [, setNow] = useState(Date.now());
  const secondsLeft = remainingSeconds(liveState);
  const classFlag = getClassFlagCode(competition.boatClass);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!liveState || liveState.status !== "countdown" || secondsLeft > 0) return;
    void updateLiveRaceState(competition.id, liveState.raceId, {
      status: "started",
      officialStartAt: liveState.officialStartAt ?? Date.now(),
      activeFlags: ["Orange"],
    });
  }, [competition.id, liveState, secondsLeft]);

  const visibleFlags = useMemo(() => {
    if (!liveState) return [classFlag, "Orange"];
    if (liveState.status === "countdown" && secondsLeft <= 60 && secondsLeft > 0) {
      return liveState.activeFlags.filter((flag) => flag !== preparatoryFlag);
    }
    return liveState.activeFlags.length ? liveState.activeFlags : [classFlag, "Orange"];
  }, [classFlag, liveState, preparatoryFlag, secondsLeft]);

  async function prepareStart() {
    if (!liveState) return;
    const countdownSeconds = countdownSecondsForMode(mode);
    await updateLiveRaceState(competition.id, liveState.raceId, {
      status: "not_started",
      countdownMode: mode,
      countdownSeconds,
      countdownStartedAt: undefined,
      selectedFlagCode: preparatoryFlag,
      activeFlags: [classFlag, "Orange"],
    });
  }

  async function launchCountdown() {
    if (!liveState) return;
    if (liveState.activeFlags.includes("AP")) return;
    const countdownSeconds = countdownSecondsForMode(mode);
    if (mode === "direct") {
      await directStart();
      return;
    }
    await updateLiveRaceState(competition.id, liveState.raceId, {
      status: "countdown",
      countdownMode: mode,
      countdownSeconds,
      countdownStartedAt: Date.now(),
      selectedFlagCode: preparatoryFlag,
      activeFlags: [classFlag, "Orange", preparatoryFlag],
    });
  }

  async function directStart() {
    if (!liveState) return;
    await updateLiveRaceState(competition.id, liveState.raceId, {
      status: "started",
      countdownMode: "direct",
      countdownSeconds: 0,
      countdownStartedAt: Date.now(),
      officialStartAt: Date.now(),
      activeFlags: ["Orange"],
    });
  }

  async function cancelStart() {
    if (!liveState) return;
    await updateLiveRaceState(competition.id, liveState.raceId, {
      status: "cancelled",
      countdownStartedAt: undefined,
      activeFlags: ["AP", "Orange"],
    });
  }

  async function toggleFlag(flag: string) {
    if (!liveState) return;
    const activeFlags = liveState.activeFlags.includes(flag)
      ? liveState.activeFlags.filter((item) => item !== flag)
      : [...liveState.activeFlags, flag];
    await updateLiveRaceState(competition.id, liveState.raceId, { activeFlags });
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">Race start</h2>
            <Badge variant={liveState?.status === "started" ? "success" : "secondary"}>{liveState?.status ?? "not_started"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleFlags.map((flag) => <SailingFlag key={flag} code={flag} size="sm" showLabel />)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-950 px-6 py-4 text-center text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Countdown</p>
          <p className="font-mono text-5xl font-black">{formatCountdown(secondsLeft)}</p>
        </div>
      </div>

      {!readOnly ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto_auto_auto]">
          <Select value={mode} onValueChange={(value) => setMode(value as StartCountdownMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5min">5 min</SelectItem>
              <SelectItem value="3min">3 min</SelectItem>
              <SelectItem value="1min">1 min</SelectItem>
              <SelectItem value="direct">Depart direct</SelectItem>
            </SelectContent>
          </Select>
          <Select value={preparatoryFlag} onValueChange={setPreparatoryFlag}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="P">P</SelectItem>
              <SelectItem value="I">I</SelectItem>
              <SelectItem value="Z">Z</SelectItem>
              <SelectItem value="U">U / UFD</SelectItem>
              <SelectItem value="Black">Black / BFD</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={prepareStart}>Preparer depart</Button>
          <Button onClick={launchCountdown} disabled={liveState?.activeFlags.includes("AP")}>Lancer countdown</Button>
          <Button variant="secondary" onClick={directStart}>Depart immediat</Button>
          <Button variant="outline" onClick={cancelStart}>Annuler</Button>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">World Sailing start timeline: 5:00 Class ON, 4:00 Preparatory ON, 1:00 Preparatory OFF, 0:00 Class OFF Start</p>
            <div className="flex flex-wrap gap-2">
              {["Orange", "AP", classFlag, "P", "I", "U", "Black", "X", "FirstSubstitute", "Blue"].map((flag) => (
                <Button key={flag} type="button" size="sm" variant={liveState?.activeFlags.includes(flag) ? "default" : "outline"} onClick={() => toggleFlag(flag)}>
                  {flag === "FirstSubstitute" ? "General Recall" : flag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
