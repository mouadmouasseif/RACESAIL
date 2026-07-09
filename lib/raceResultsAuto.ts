import type { Competition, PenaltyCode, RacePenaltyCode, RaceResult, RaceStatus } from "@/types";
import { createBlankRaces, getFinishedRaceCount, rankAthletes } from "@/lib/scoring";
import { sailNumberMatches } from "@/lib/sailNumber";

const fullPenaltyCodes: RacePenaltyCode[] = ["UFD", "BFD", "DSQ", "DNE", "DGM", "DNS", "DNC", "DNF", "RET"];

function roundPoint(value: number) {
  return Math.round(value * 10) / 10;
}

function toPenaltyCode(code?: RacePenaltyCode | PenaltyCode) {
  if (!code || code === "OK") return "NONE";
  return code as RacePenaltyCode;
}

function toLegacyPenalty(code: RacePenaltyCode): PenaltyCode {
  if (code === "NONE") return "OK";
  if (["UFD", "BFD", "DNC", "DNF", "DNS", "DSQ", "RET", "ZFP", "SCP", "DPI", "RDG"].includes(code)) return code as PenaltyCode;
  return "DSQ";
}

export function calculateAutoPoints(input: {
  rank?: number;
  penaltyCode?: RacePenaltyCode | PenaltyCode;
  penaltyPoints?: number;
  numberOfEntries: number;
}) {
  const penaltyCode = toPenaltyCode(input.penaltyCode);
  const rank = input.rank ?? 0;
  const entriesPlusOne = input.numberOfEntries + 1;

  if (penaltyCode === "NONE") return rank;
  if (fullPenaltyCodes.includes(penaltyCode)) return entriesPlusOne;
  if (penaltyCode === "ZFP") return roundPoint(rank + 0.2 * input.numberOfEntries);
  if (penaltyCode === "SCP") return roundPoint(rank + (input.penaltyPoints ?? 0));
  if (penaltyCode === "DPI" || penaltyCode === "RDG") return roundPoint(input.penaltyPoints ?? entriesPlusOne);
  return entriesPlusOne;
}

export function findAthleteBySailNumber(competition: Competition, sailNumber: string) {
  return competition.athletes.find((athlete) => sailNumberMatches(sailNumber, athlete.sailNumber));
}

function getRaceResults(competition: Competition, raceNumber: number) {
  return competition.athletes
    .map((athlete) => athlete.results[raceNumber])
    .filter(Boolean) as RaceResult[];
}

function nextFinishRank(competition: Competition, raceNumber: number) {
  const ranks = getRaceResults(competition, raceNumber)
    .map((result) => result.finishPosition ?? result.rank ?? result.position ?? 0)
    .filter((value) => value > 0);
  return ranks.length ? Math.max(...ranks) + 1 : 1;
}

function resultWithPoints(result: RaceResult, numberOfEntries: number): RaceResult {
  const penaltyCode = toPenaltyCode(result.penaltyCode ?? result.penalty);
  const rank = result.finishPosition ?? result.rank ?? result.position;
  const points = calculateAutoPoints({
    rank,
    penaltyCode,
    penaltyPoints: result.penaltyPoints,
    numberOfEntries,
  });

  return {
    ...result,
    position: penaltyCode === "NONE" ? rank : undefined,
    rank: penaltyCode === "NONE" ? rank : result.rank,
    finishPosition: penaltyCode === "NONE" ? rank : result.finishPosition,
    penalty: toLegacyPenalty(penaltyCode),
    penaltyCode,
    points,
    status: penaltyCode === "NONE" ? "FIN" : penaltyCode,
  };
}

function applyRaceResults(competition: Competition, raceNumber: number, results: RaceResult[], status?: RaceStatus) {
  const resultBySail = new Map(results.map((result) => [result.sailNumber, resultWithPoints(result, competition.athletes.length)]));
  const athletesWithResults = competition.athletes.map((athlete) => {
    const result = Array.from(resultBySail.values()).find((item) => sailNumberMatches(item.sailNumber, athlete.sailNumber));
    if (!result) return athlete;
    return {
      ...athlete,
      results: {
        ...athlete.results,
        [raceNumber]: { ...result, sailNumber: athlete.sailNumber },
      },
    };
  });

  const races = createBlankRaces(competition.raceCount, competition.races).map((race) => {
    if (race.raceNumber !== raceNumber) return race;
    const raceResults = athletesWithResults.map((athlete) => athlete.results[raceNumber]).filter(Boolean) as RaceResult[];
    return {
      ...race,
      status: status ?? (race.status === "Finished" ? "Corrected" : race.status),
      results: raceResults,
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    ...competition,
    athletes: rankAthletes(athletesWithResults, competition.raceCount, getFinishedRaceCount(races)),
    races,
    updatedAt: new Date().toISOString(),
  };
}

export function addAutomaticFinish(competition: Competition, raceNumber: number, sailNumber: string, finishTime = Date.now()) {
  const athlete = findAthleteBySailNumber(competition, sailNumber);
  if (!athlete) return competition;
  const existingResults = getRaceResults(competition, raceNumber).filter((result) => !sailNumberMatches(result.sailNumber, athlete.sailNumber));
  const rank = nextFinishRank(competition, raceNumber);
  const race = competition.races.find((item) => item.raceNumber === raceNumber);
  const officialStart = race?.results.find((result) => result.raceNumber === raceNumber)?.finishTime;
  const result: RaceResult = {
    raceNumber,
    sailNumber: athlete.sailNumber,
    position: rank,
    rank,
    finishPosition: rank,
    finishTime,
    elapsedSeconds: officialStart ? Math.max(0, Math.round((finishTime - officialStart) / 1000)) : undefined,
    penalty: "OK",
    penaltyCode: "NONE",
    points: rank,
    status: "FIN",
  };
  return applyRaceResults(competition, raceNumber, [...existingResults, result]);
}

export function setRacePenalty(
  competition: Competition,
  raceNumber: number,
  sailNumber: string,
  penaltyCode: RacePenaltyCode | PenaltyCode,
  penaltyPoints?: number,
  notes?: string,
) {
  const athlete = findAthleteBySailNumber(competition, sailNumber);
  if (!athlete) return competition;
  const existingResults = getRaceResults(competition, raceNumber).filter((result) => !sailNumberMatches(result.sailNumber, athlete.sailNumber));
  const existing = athlete.results[raceNumber];
  const normalized = toPenaltyCode(penaltyCode);
  const result: RaceResult = {
    raceNumber,
    sailNumber: athlete.sailNumber,
    rank: existing?.rank,
    finishPosition: existing?.finishPosition,
    finishTime: existing?.finishTime,
    elapsedSeconds: existing?.elapsedSeconds,
    position: normalized === "NONE" ? existing?.position : undefined,
    penalty: toLegacyPenalty(normalized),
    penaltyCode: normalized,
    penaltyPoints,
    points: 0,
    status: normalized === "NONE" ? "FIN" : normalized,
    notes,
  };
  return applyRaceResults(competition, raceNumber, [...existingResults, result]);
}

export function removeRaceResult(competition: Competition, raceNumber: number, sailNumber: string) {
  const athletes = competition.athletes.map((athlete) => {
    if (!sailNumberMatches(sailNumber, athlete.sailNumber)) return athlete;
    const results = { ...athlete.results };
    delete results[raceNumber];
    return { ...athlete, results };
  });
  const races = createBlankRaces(competition.raceCount, competition.races).map((race) =>
    race.raceNumber === raceNumber
      ? { ...race, results: race.results.filter((result) => !sailNumberMatches(sailNumber, result.sailNumber)), updatedAt: new Date().toISOString() }
      : race,
  );
  return {
    ...competition,
    athletes: rankAthletes(athletes, competition.raceCount, getFinishedRaceCount(races)),
    races,
    updatedAt: new Date().toISOString(),
  };
}

export function moveRaceResult(competition: Competition, raceNumber: number, sailNumber: string, direction: -1 | 1) {
  const finishers = getRaceResults(competition, raceNumber)
    .filter((result) => (result.penaltyCode ?? "NONE") === "NONE" && (result.finishPosition ?? result.position))
    .sort((a, b) => (a.finishPosition ?? a.position ?? 0) - (b.finishPosition ?? b.position ?? 0));
  const index = finishers.findIndex((result) => sailNumberMatches(sailNumber, result.sailNumber));
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= finishers.length) return competition;
  [finishers[index], finishers[nextIndex]] = [finishers[nextIndex], finishers[index]];
  const reranked = finishers.map((result, itemIndex) => ({ ...result, rank: itemIndex + 1, finishPosition: itemIndex + 1, position: itemIndex + 1 }));
  const penalties = getRaceResults(competition, raceNumber).filter((result) => !reranked.some((item) => sailNumberMatches(item.sailNumber, result.sailNumber)));
  return applyRaceResults(competition, raceNumber, [...reranked, ...penalties], "Corrected");
}

export function recalculateRaceResults(competition: Competition, raceNumber: number) {
  const results = getRaceResults(competition, raceNumber);
  const finishers = results
    .filter((result) => (result.penaltyCode ?? "NONE") === "NONE" && result.finishTime)
    .sort((a, b) => (a.finishTime ?? 0) - (b.finishTime ?? 0))
    .map((result, index) => ({ ...result, rank: index + 1, finishPosition: index + 1, position: index + 1 }));
  const others = results.filter((result) => !finishers.some((item) => sailNumberMatches(item.sailNumber, result.sailNumber)));
  return applyRaceResults(competition, raceNumber, [...finishers, ...others], "Corrected");
}

export function finishRaceWithDnc(competition: Competition, raceNumber: number) {
  const existing = getRaceResults(competition, raceNumber);
  const missing = competition.athletes
    .filter((athlete) => !existing.some((result) => sailNumberMatches(result.sailNumber, athlete.sailNumber)))
    .map((athlete): RaceResult => ({
      raceNumber,
      sailNumber: athlete.sailNumber,
      penalty: "DNC",
      penaltyCode: "DNC",
      points: competition.athletes.length + 1,
      status: "DNC",
    }));
  return applyRaceResults(competition, raceNumber, [...existing, ...missing], "Finished");
}

export function openRace(competition: Competition, raceNumber: number) {
  return {
    ...competition,
    races: createBlankRaces(competition.raceCount, competition.races).map((race) =>
      race.raceNumber === raceNumber ? { ...race, status: "Draft" as RaceStatus, updatedAt: new Date().toISOString() } : race,
    ),
    updatedAt: new Date().toISOString(),
  };
}
