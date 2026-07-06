import type { Athlete, PenaltyCode, Race, RaceResult } from "@/types";

export function raceNumbers(raceCount: number) {
  return Array.from({ length: raceCount }, (_, index) => index + 1);
}

export function raceKeys(raceCount: number) {
  return raceNumbers(raceCount).map((raceNumber) => `R${raceNumber}`);
}

export function calculatePenaltyPoints(athleteCount: number): number {
  return athleteCount + 1;
}

export function shouldApplyDiscard(raceCount: number): boolean {
  return raceCount >= 4;
}

export function scoreRaceResult(result: RaceResult, athleteCount: number): RaceResult {
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
): Athlete {
  const scoredResults: Record<number, RaceResult> = { ...athlete.results };
  const scores: number[] = [];

  for (let i = 1; i <= raceCount; i++) {
    const result = athlete.results[i];
    if (!result) continue;

    const scoredResult = scoreRaceResult(result, athleteCount);
    scoredResults[i] = scoredResult;
    if (scoredResult.points > 0) scores.push(scoredResult.points);
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  const discard = shouldApplyDiscard(raceCount) && scores.length > 0 ? Math.max(...scores) : 0;
  const net = total - discard;

  return {
    ...athlete,
    results: scoredResults,
    total,
    discard,
    net,
  };
}

export function rankAthletes(athletes: Athlete[], raceCount: number): Athlete[] {
  const athleteCount = athletes.length;
  const scoredAthletes = athletes.map((athlete) => calculateAthleteScores(athlete, raceCount, athleteCount));

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

export function rankedAthletes(athletes: Athlete[], raceCount?: number) {
  if (typeof raceCount === "number") return rankAthletes(athletes, raceCount);
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
  const value = result.penalty !== "OK" ? `${result.penalty} ${result.points}` : String(result.points || result.position || "-");
  return isDiscarded ? `(${value})` : value;
}

export function getDiscardedRaceNumbers(athlete: Athlete, raceCount: number) {
  if (!shouldApplyDiscard(raceCount) || !athlete.discard) return new Set<number>();
  for (let raceNumber = 1; raceNumber <= raceCount; raceNumber++) {
    const result = athlete.results[raceNumber];
    if (result && result.points === athlete.discard) return new Set([raceNumber]);
  }
  return new Set<number>();
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
