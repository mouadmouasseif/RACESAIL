import type { Athlete, Competition, RaceResult } from "@/types";
import { rankAthletes, createBlankRaces, scoreRaceResult } from "@/lib/scoring";

function result(raceNumber: number, sailNumber: string, position: number | undefined, penalty: RaceResult["penalty"] = "OK"): RaceResult {
  return scoreRaceResult({ raceNumber, sailNumber, position, penalty, points: 0 }, 8);
}

const athletes: Athlete[] = [
  { id: "ath-1", firstName: "Yassine", lastName: "Alaoui", age: 13, nationality: "Morocco", flag: "MA", clubName: "Royal Sailing Club", sailNumber: "MAR 121", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 1 },
  { id: "ath-2", firstName: "Noura", lastName: "Benali", age: 12, nationality: "Morocco", flag: "MA", clubName: "Tangier Yacht Club", sailNumber: "MAR 144", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 2 },
  { id: "ath-3", firstName: "Omar", lastName: "Al Mansoori", age: 13, nationality: "UAE", flag: "AE", clubName: "Dubai Offshore Sailing Club", sailNumber: "UAE 08", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 3 },
  { id: "ath-4", firstName: "Lina", lastName: "Al Nuaimi", age: 11, nationality: "UAE", flag: "AE", clubName: "Abu Dhabi Sailing Academy", sailNumber: "UAE 17", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 4 },
  { id: "ath-5", firstName: "Camille", lastName: "Moreau", age: 12, nationality: "France", flag: "FR", clubName: "CN Marseille", sailNumber: "FRA 62", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 5 },
  { id: "ath-6", firstName: "Theo", lastName: "Bernard", age: 13, nationality: "France", flag: "FR", clubName: "La Rochelle Nautique", sailNumber: "FRA 88", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 6 },
  { id: "ath-7", firstName: "Giulia", lastName: "Rossi", age: 12, nationality: "Italy", flag: "IT", clubName: "Yacht Club Italiano", sailNumber: "ITA 35", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 7 },
  { id: "ath-8", firstName: "Marco", lastName: "Bianchi", age: 11, nationality: "Italy", flag: "IT", clubName: "Circolo Vela Bari", sailNumber: "ITA 49", boatClass: "Optimist", results: {}, total: 0, discard: 0, net: 0, rank: 8 },
];

const seededResults: RaceResult[] = [
  result(1, "MAR 121", 1), result(2, "MAR 121", 2), result(3, "MAR 121", 1), result(4, "MAR 121", 12), result(5, "MAR 121", 1),
  result(1, "MAR 144", 3), result(2, "MAR 144", 1), result(3, "MAR 144", 2), result(4, "MAR 144", undefined, "DNF"), result(5, "MAR 144", 2),
  result(1, "UAE 08", 2), result(2, "UAE 08", undefined, "DNC"), result(3, "UAE 08", 3), result(4, "UAE 08", 4), result(5, "UAE 08", 3),
  result(1, "UAE 17", 5), result(2, "UAE 17", 3), result(3, "UAE 17", undefined, "UFD"), result(4, "UAE 17", 2), result(5, "UAE 17", 4),
  result(1, "FRA 62", 4), result(2, "FRA 62", 5), result(3, "FRA 62", 6), result(4, "FRA 62", 5), result(5, "FRA 62", undefined, "BFD"),
  result(1, "FRA 88", 7), result(2, "FRA 88", 6), result(3, "FRA 88", 5), result(4, "FRA 88", 6), result(5, "FRA 88", 5),
  result(1, "ITA 35", 6), result(2, "ITA 35", 8), result(3, "ITA 35", 7), result(4, "ITA 35", 7), result(5, "ITA 35", 6),
  result(1, "ITA 49", 8), result(2, "ITA 49", 7), result(3, "ITA 49", 8), result(4, "ITA 49", 8), result(5, "ITA 49", 7),
];

const athletesWithResults = athletes.map((athlete) => ({
  ...athlete,
  results: Object.fromEntries(
    seededResults
      .filter((raceResult) => raceResult.sailNumber === athlete.sailNumber)
      .map((raceResult) => [raceResult.raceNumber, raceResult]),
  ),
}));

export const demoCompetition: Competition = {
  id: "demo-optimist-cup-2026",
  name: "International Optimist Cup 2026",
  clubName: "Royal Sailing Club",
  location: "Casablanca, Morocco",
  date: "2026-07-18",
  boatClass: "Optimist",
  raceCount: 9,
  scoringSystem: "Low Point",
  createdAt: "2026-07-06T10:00:00.000Z",
  updatedAt: "2026-07-06T10:00:00.000Z",
  athletes: rankAthletes(athletesWithResults, 9),
  races: createBlankRaces(9).map((race) => ({
    ...race,
    status: race.raceNumber <= 5 ? "Finished" : "Draft",
    results: seededResults.filter((raceResult) => raceResult.raceNumber === race.raceNumber),
  })),
};
