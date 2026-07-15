"use client";

import { useMemo, useState } from "react";
import type { Competition, MarkType, RaceLiveState } from "@/types";
import { addAutomaticFinish, setRacePenalty } from "@/lib/raceResultsAuto";
import { formatRaceTime, markBoatStarted, markUFD, recordMark, type LiveRaceData } from "@/lib/raceLive";
import { findAthleteBySailNumber } from "@/lib/raceResultsAuto";
import { sailNumberMatches } from "@/lib/sailNumber";
import { FlagIcon } from "@/components/flag-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type LiveRaceTableProps = {
  competition: Competition;
  raceId: string;
  liveState?: RaceLiveState;
  liveData: LiveRaceData;
  readOnly?: boolean;
  onAction?: () => void;
  onCompetitionSaved?: (competition: Competition) => void;
};

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusVariant(status?: string) {
  if (status === "finished") return "success";
  if (status === "ufd") return "secondary";
  return "secondary";
}

export function LiveRaceTable({ competition, raceId, liveState, liveData, readOnly = false, onAction, onCompetitionSaved }: LiveRaceTableProps) {
  const [sailNumber, setSailNumber] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const baseStart = liveState?.officialStartAt ?? liveState?.firstBoatStartedAt;

  function persistCompetition(next: Competition) {
    onCompetitionSaved?.(next);
  }

  const rows = useMemo(() => {
    const startItems = liveData.startList.length > 0
      ? liveData.startList
      : competition.athletes.map((athlete) => ({
        id: `${raceId}-${athlete.sailNumber}`,
        competitionId: competition.id,
        raceId,
        sailNumber: athlete.sailNumber,
        sailorName: `${athlete.firstName} ${athlete.lastName}`,
        club: athlete.clubName,
        nationality: athlete.nationality,
        boatClass: athlete.boatClass,
        status: "ready" as const,
      }));

    return startItems.map((item) => {
      const athlete = competition.athletes.find((entry) => sailNumberMatches(item.sailNumber, entry.sailNumber));
      const windward = liveData.marks.find((mark) => sailNumberMatches(item.sailNumber, mark.sailNumber) && mark.markType === "windward_mark");
      const leeward = liveData.marks.find((mark) => sailNumberMatches(item.sailNumber, mark.sailNumber) && mark.markType === "leeward_mark");
      const finish = liveData.marks.find((mark) => sailNumberMatches(item.sailNumber, mark.sailNumber) && mark.markType === "finish");
      const ufd = liveData.ufd.find((entry) => sailNumberMatches(item.sailNumber, entry.sailNumber));
      const protests = liveData.protests.filter((protest) =>
        sailNumberMatches(item.sailNumber, protest.protesterSailNumber) || sailNumberMatches(item.sailNumber, protest.protestedSailNumber),
      );
      return {
        ...item,
        clubLogo: athlete?.clubLogo,
        nationality: item.nationality ?? athlete?.nationality,
        windward,
        leeward,
        finish,
        ufd,
        protests,
      };
    }).sort((a, b) => {
      const aFinish = a.finish?.position ?? 9999;
      const bFinish = b.finish?.position ?? 9999;
      if (aFinish !== bFinish) return aFinish - bFinish;
      return a.sailNumber.localeCompare(b.sailNumber);
    });
  }, [competition, liveData, raceId]);

  const leaders = {
    windward: liveData.marks.find((mark) => mark.markType === "windward_mark" && mark.position === 1),
    leeward: liveData.marks.find((mark) => mark.markType === "leeward_mark" && mark.position === 1),
    firstFinish: liveData.marks.find((mark) => mark.markType === "finish" && mark.position === 1),
    lastFinish: [...liveData.marks].filter((mark) => mark.markType === "finish").sort((a, b) => b.position - a.position)[0],
  };

  async function runAction(markType: MarkType | "start" | "ufd", rowSailNumber?: string) {
    const target = (rowSailNumber ?? sailNumber).trim();
    if (!target) return;
    setMessage("");

    const athlete = findAthleteBySailNumber(competition, target);
    const resolvedSailNumber = athlete?.sailNumber ?? target;

    if (!athlete) {
      setMessage("Sail number not found in this class.");
      return;
    }

    if ((markType === "finish" || markType === "windward_mark" || markType === "leeward_mark") && !liveState?.officialStartAt && !liveState?.firstBoatStartedAt) {
      setMessage("Open or start the race before recording marks.");
      return;
    }

    if (markType === "finish" && liveData.marks.some((mark) => mark.markType === "finish" && sailNumberMatches(resolvedSailNumber, mark.sailNumber))) {
      setMessage(`${resolvedSailNumber} is already finished.`);
      return;
    }

    if (markType === "start") {
      await markBoatStarted({ competitionId: competition.id, raceId, sailNumber: resolvedSailNumber });
    } else if (markType === "ufd") {
      await markUFD({ competitionId: competition.id, raceId, sailNumber: resolvedSailNumber, note });
      if (athlete && liveState) {
        persistCompetition(setRacePenalty(competition, liveState.raceNumber, athlete.sailNumber, "UFD", undefined, note));
      }
    } else {
      await recordMark({ competitionId: competition.id, raceId, sailNumber: resolvedSailNumber, markType });
      if (markType === "finish" && athlete && liveState) {
        persistCompetition(addAutomaticFinish(competition, liveState.raceNumber, athlete.sailNumber));
      }
    }

    setSailNumber("");
    setNote("");
    setMessage(markType === "finish" ? `${resolvedSailNumber} finished.` : `${resolvedSailNumber} saved.`);
    onAction?.();
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Live race table</h2>
          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
            <span>Windward first: <strong>{leaders.windward?.sailNumber ?? "-"}</strong></span>
            <span>Leeward first: <strong>{leaders.leeward?.sailNumber ?? "-"}</strong></span>
            <span>First finish: <strong>{leaders.firstFinish?.sailNumber ?? "-"}</strong></span>
            <span>Last finish: <strong>{leaders.lastFinish?.sailNumber ?? "-"}</strong></span>
          </div>
        </div>
        {!readOnly ? (
          <div className="grid gap-2 md:min-w-[520px]">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <Input
                value={sailNumber}
                onChange={(event) => setSailNumber(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runAction("finish");
                  if (event.key === "Escape") setSailNumber("");
                }}
                placeholder="Sail Number"
                className="text-base"
                inputMode="text"
                autoComplete="off"
              />
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="UFD / protest note" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => runAction("start")}>Start</Button>
              <Button size="sm" variant="secondary" onClick={() => runAction("windward_mark")}>Windward</Button>
              <Button size="sm" variant="secondary" onClick={() => runAction("leeward_mark")}>Leeward</Button>
              <Button size="sm" onClick={() => runAction("finish")}>Finish</Button>
              <Button size="sm" variant="destructive" onClick={() => runAction("ufd")}>UFD</Button>
            </div>
            {message ? <p className="text-sm font-semibold text-slate-700">{message}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-600">
              <th className="p-2">Rank live</th>
              <th className="p-2">Nat</th>
              <th className="p-2">Club</th>
              <th className="p-2">Sail No</th>
              <th className="p-2">Name</th>
              <th className="p-2">Status</th>
              <th className="p-2">Start</th>
              <th className="p-2">Windward</th>
              <th className="p-2">Leeward</th>
              <th className="p-2">Finish</th>
              <th className="p-2">Time</th>
              <th className="p-2">UFD</th>
              <th className="p-2">Protest</th>
              {!readOnly ? <th className="p-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const elapsed = row.finish && baseStart ? Math.max(0, Math.round((row.finish.timestamp - baseStart) / 1000)) : undefined;
              return (
                <tr key={row.id} className="border-b align-middle hover:bg-cyan-50/40">
                  <td className="p-2 font-semibold">{row.finish ? row.finish.position : index + 1}</td>
                  <td className="p-2"><FlagIcon nationality={row.nationality} /></td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-2">
                      {row.clubLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.clubLogo} alt={row.club ?? "Club"} className="h-7 w-7 rounded object-contain" />
                      ) : null}
                      {row.club ?? "-"}
                    </span>
                  </td>
                  <td className="p-2 font-mono font-bold">{row.sailNumber}</td>
                  <td className="p-2">{row.sailorName}</td>
                  <td className="p-2"><Badge variant={statusVariant(row.ufd ? "ufd" : row.status)}>{row.ufd ? "ufd" : row.status ?? "ready"}</Badge></td>
                  <td className="p-2">{formatTimestamp(liveState?.firstBoatStartedAt)}</td>
                  <td className="p-2">{row.windward ? `${row.windward.position} - ${formatTimestamp(row.windward.timestamp)}` : "-"}</td>
                  <td className="p-2">{row.leeward ? `${row.leeward.position} - ${formatTimestamp(row.leeward.timestamp)}` : "-"}</td>
                  <td className="p-2">{row.finish ? `${row.finish.position} - ${formatTimestamp(row.finish.timestamp)}` : "-"}</td>
                  <td className="p-2 font-mono">{formatRaceTime(elapsed)}</td>
                  <td className="p-2">{row.ufd ? <Badge variant="secondary">UFD</Badge> : "-"}</td>
                  <td className="p-2">{row.protests.length ? <Badge variant="secondary">Protest {row.protests.length}</Badge> : "-"}</td>
                  {!readOnly ? (
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => runAction("windward_mark", row.sailNumber)}>W</Button>
                        <Button size="sm" variant="outline" onClick={() => runAction("leeward_mark", row.sailNumber)}>L</Button>
                        <Button size="sm" variant="outline" onClick={() => runAction("finish", row.sailNumber)}>F</Button>
                        <Button size="sm" variant="destructive" onClick={() => runAction("ufd", row.sailNumber)}>UFD</Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
