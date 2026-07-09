import type { Athlete, PenaltyCode, Race, RacePenaltyCode, RaceResult } from "@/types";

export function raceNumbers(raceCount: number) {
  return Array.from({ length: raceCount }, (_, index) => index + 1);
}

export function raceKeys(raceCount: number) {
  return raceNumbers(raceCount).map((raceNumber) => `R${raceNumber}`);
}

export function calculatePenaltyPoints(athleteCount: number): number {
  return athleteCount + 1;
}

export function getFinishedRaceCount(races: Race[] = []) {
  return races.filter((race) => race.status === "Finished" || race.status === "Corrected").length;
}

export function shouldApplyDiscard(finishedRaceCount: number): boolean {
  return finishedRaceCount >= 5;
}

export function getDiscardCount(raceCount: number, finishedRaceCount: number): number {
  if (finishedRaceCount < 5) return 0;
  return raceCount >= 10 || finishedRaceCount >= 10 ? 2 : 1;
}

export function scoreRaceResult(result: RaceResult, athleteCount: number): RaceResult {
  const penaltyCode = (result.penaltyCode ?? (result.penalty === "OK" ? "NONE" : result.penalty)) as RacePenaltyCode;
  if (penaltyCode && penaltyCode !== "NONE") {
    const rank = result.rank ?? result.finishPosition ?? result.position ?? 0;
    const points = penaltyCode === "ZFP"
      ? Math.round((rank + 0.2 * athleteCount) * 10) / 10
      : penaltyCode === "SCP"
        ? Math.round((rank + (result.penaltyPoints ?? 0)) * 10) / 10
        : penaltyCode === "DPI" || penaltyCode === "RDG"
          ? Math.round((result.penaltyPoints ?? athleteCount + 1) * 10) / 10
          : athleteCount + 1;

    return {
      ...result,
      penaltyCode,
      penalty: result.penalty === "OK" ? "DSQ" : result.penalty,
      points,
      position: undefined,
      status: result.status ?? penaltyCode,
    };
  }

  if (typeof result.points === "number" && result.points > 0 && result.status === "FIN") {
    return {
      ...result,
      penaltyCode: "NONE",
      penalty: "OK",
      points: result.points,
      position: result.position ?? result.finishPosition ?? result.rank,
    };
  }

  const points =
    result.penalty !== "OK"
      ? calculatePenaltyPoints(athleteCount)
      : typeof result.position === "number"
        ? result.position
        : 0;

  return {
    ...result,
    points,
    position: result.penalty === "OK" ? result.position : undefined,
  };
}

export function calculateAthleteScores(
  athlete: Athlete,
  raceCount: number,
  athleteCount: number,
  finishedRaceCount = 0,
): Athlete {
  const scoredResults: Record<number, RaceResult> = { ...athlete.results };
  const scores: Array<{ raceNumber: number; score: number }> = [];

  for (let i = 1; i <= raceCount; i++) {
    const result = athlete.results[i];
    if (!result) continue;

    const scoredResult = scoreRaceResult(result, athleteCount);
    scoredResults[i] = scoredResult;
    if (scoredResult.points > 0) scores.push({ raceNumber: i, score: scoredResult.points });
  }

  const total = scores.reduce((sum, item) => sum + item.score, 0);
  const discardCount = Math.min(getDiscardCount(raceCount, finishedRaceCount), scores.length);
  const discard = [...scores]
    .sort((a, b) => b.score - a.score || b.raceNumber - a.raceNumber)
    .slice(0, discardCount)
    .reduce((sum, item) => sum + item.score, 0);
  const net = total - discard;

  return {
    ...athlete,
    results: scoredResults,
    total,
    discard,
    net,
  };
}

export function rankAthletes(athletes: Athlete[], raceCount: number, finishedRaceCount = 0): Athlete[] {
  const athleteCount = athletes.length;
  const scoredAthletes = athletes.map((athlete) => calculateAthleteScores(athlete, raceCount, athleteCount, finishedRaceCount));

  scoredAthletes.sort((a, b) => {
    if (a.net !== b.net) return a.net - b.net;
    if (a.total !== b.total) return a.total - b.total;
    return a.lastName.localeCompare(b.lastName);
  });

  return scoredAthletes.map((athlete, index) => ({
    ...athlete,
    rank: index + 1,
  }));
}

export function rankedAthletes(athletes: Athlete[], raceCount?: number, finishedRaceCount = 0) {
  if (typeof raceCount === "number") return rankAthletes(athletes, raceCount, finishedRaceCount);
  return [...athletes].sort((a, b) => a.rank - b.rank || a.net - b.net || a.lastName.localeCompare(b.lastName));
}

export function createBlankRaces(raceCount: number, existing: Race[] = []): Race[] {
  const byNumber = new Map(existing.map((race) => [race.raceNumber, race]));
  const maxRace = Math.max(raceCount, ...existing.map((race) => race.raceNumber), 0);

  return raceNumbers(maxRace).map((raceNumber) => {
    const existingRace = byNumber.get(raceNumber);
    return existingRace ?? { raceNumber, status: "Draft", results: [], updatedAt: new Date().toISOString() };
  });
}

export function applyRaceResultToAthletes(athletes: Athlete[], raceResult: RaceResult, raceCount: number) {
  return rankAthletes(
    athletes.map((athlete) => {
      if (athlete.sailNumber.trim().toLowerCase() !== raceResult.sailNumber.trim().toLowerCase()) return athlete;
      return {
        ...athlete,
        results: {
          ...athlete.results,
          [raceResult.raceNumber]: raceResult,
        },
      };
    }),
    raceCount,
  );
}

export function formatRaceCell(result: RaceResult | undefined, isDiscarded: boolean) {
  if (!result) return "-";
  const code = result.penaltyCode && result.penaltyCode !== "NONE" ? result.penaltyCode : result.penalty;
  const value = code !== "OK" ? `${code} ${result.points}` : String(result.points || result.position || result.finishPosition || "-");
  return isDiscarded ? `(${value})` : value;
}

export function getDiscardedRaceNumbers(athlete: Athlete, raceCount: number) {
  if (!athlete.discard) return new Set<number>();
  const discardCount = raceCount >= 10 ? 2 : 1;
  return new Set(
    Array.from({ length: raceCount }, (_, index) => index + 1)
      .map((raceNumber) => ({ raceNumber, points: athlete.results[raceNumber]?.points ?? 0 }))
      .filter((item) => item.points > 0)
      .sort((a, b) => b.points - a.points || b.raceNumber - a.raceNumber)
      .slice(0, discardCount)
      .map((item) => item.raceNumber),
  );
}

export function makeRaceResult(input: {
  raceNumber: number;
  sailNumber: string;
  position?: number;
  penalty: PenaltyCode;
  notes?: string;
  athleteCount: number;
}): RaceResult {
  return scoreRaceResult(
    {
      raceNumber: input.raceNumber,
      sailNumber: input.sailNumber,
      position: input.position,
      penalty: input.penalty,
      points: 0,
      notes: input.notes,
    },
    input.athleteCount,
  );
}
