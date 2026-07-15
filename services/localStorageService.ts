"use client";

import type { Athlete, BoatClass, Competition, RaceNotification, RaceResult, Sex } from "@/types";
import { demoCompetition } from "@/services/seed";
import { createBlankRaces, getFinishedRaceCount, rankAthletes, scoreRaceResult } from "@/lib/scoring";
import { getAthleteCategory, getFlagEmoji } from "@/lib/flags";
import { generateCompetitionCode } from "@/lib/utils";
import { boatClassIdFromName, getCompetitionBoatClasses } from "@/lib/boatClassHelpers";

const STORAGE_KEY = "raceSail.competitions";
const OLD_SYNC_QUEUE_KEY = "raceSail.firebaseSyncQueue";

function isBrowser() {
  return typeof window !== "undefined";
}

function createSafeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

function safeGetItem(key: string) {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error("raceSail localStorage read failed", error);
    return null;
  }
}

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("localStorage read error", error);
    return fallback;
  }
}

function safeSetItem(key: string, value: string) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("Storage full, clearing old sync queue");
      window.localStorage.removeItem(OLD_SYNC_QUEUE_KEY);
    }
    console.error("raceSail localStorage write failed", error);
    return false;
  }
}

function safeRemoveItem(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("raceSail localStorage remove failed", error);
  }
}

function normalizeAthlete(athlete: Partial<Athlete> & { results?: Record<string, number | RaceResult> }, athleteCount: number): Athlete {
  const results: Record<number, RaceResult> = {};

  Object.entries(athlete.results ?? {}).forEach(([key, value]) => {
    const raceNumber = Number(String(key).replace("R", ""));
    if (!raceNumber) return;
    if (typeof value === "number") {
      results[raceNumber] = scoreRaceResult(
        { raceNumber, sailNumber: athlete.sailNumber ?? "", position: value, penalty: "OK", points: value },
        athleteCount,
      );
    } else {
      results[raceNumber] = scoreRaceResult(value, athleteCount);
    }
  });

  return {
    id: athlete.id ?? createSafeId("athlete"),
    firstName: athlete.firstName ?? "",
    lastName: athlete.lastName ?? "",
    age: athlete.age ?? 0,
    sex: (athlete.sex as Sex) ?? "M",
    category: athlete.category || getAthleteCategory(athlete.age ?? 0),
    nationality: athlete.nationality ?? "",
    flag: getFlagEmoji(athlete.nationality || athlete.flag || ""),
    clubName: athlete.clubName ?? "",
    clubLogo: athlete.clubLogo,
    sailNumber: athlete.sailNumber ?? "",
    boatClassId: athlete.boatClassId ?? boatClassIdFromName(String(athlete.boatClass ?? "Optimist")),
    boatClass: (athlete.boatClass as BoatClass) ?? "Optimist",
    licenseNumber: athlete.licenseNumber,
    results,
    total: athlete.total ?? 0,
    discard: athlete.discard ?? 0,
    net: athlete.net ?? athlete.total ?? 0,
    rank: athlete.rank ?? 0,
  };
}

function normalizeCompetition(competition: Partial<Competition> & { status?: string }): Competition {
  const raceCount = Math.max(1, Number(competition.raceCount) || 1);
  const rawAthletes = competition.athletes ?? [];
  const normalizedAthletes = rawAthletes.map((athlete) => normalizeAthlete(athlete, rawAthletes.length));
  const raceResults = normalizedAthletes.flatMap((athlete) => Object.values(athlete.results));
  const races = createBlankRaces(raceCount, competition.races).map((race) => ({
    ...race,
    results: raceResults.filter((result) => result.raceNumber === race.raceNumber),
  }));
  const athletes = rankAthletes(normalizedAthletes, raceCount, getFinishedRaceCount(races));

  return {
    id: competition.id ?? createSafeId("competition"),
    publicCode: competition.publicCode ?? generateCompetitionCode(),
    competitionCode: competition.competitionCode ?? competition.publicCode ?? generateCompetitionCode(),
    publicAccessEnabled: competition.publicAccessEnabled ?? competition.isLivePublished ?? false,
    allowedRoles: competition.allowedRoles ?? ["coach", "athlete"],
    originalCompetitionId: competition.originalCompetitionId,
    isLivePublished: competition.isLivePublished ?? false,
    name: competition.name ?? "Untitled Competition",
    clubName: competition.clubName ?? "",
    clubLogo: competition.clubLogo,
    competitionLogo: competition.competitionLogo,
    location: competition.location ?? "",
    date: competition.date ?? new Date().toISOString().slice(0, 10),
    boatClass: (competition.boatClass as BoatClass) ?? "Optimist",
    boatClasses: getCompetitionBoatClasses({
      ...(competition as Competition),
      id: competition.id ?? "migration",
      publicCode: competition.publicCode ?? "",
      isLivePublished: competition.isLivePublished ?? false,
      name: competition.name ?? "Untitled Competition",
      clubName: competition.clubName ?? "",
      location: competition.location ?? "",
      date: competition.date ?? new Date().toISOString().slice(0, 10),
      boatClass: (competition.boatClass as BoatClass) ?? "Optimist",
      raceCount,
      scoringSystem: "Low Point",
      athletes,
      races,
      createdAt: competition.createdAt ?? new Date().toISOString(),
      updatedAt: competition.updatedAt ?? new Date().toISOString(),
    }),
    raceCount,
    scoringSystem: "Low Point",
    athletes,
    races,
    notifications: competition.notifications ?? [],
    createdAt: competition.createdAt ?? new Date().toISOString(),
    updatedAt: competition.updatedAt ?? new Date().toISOString(),
  };
}

function readStorage(): Competition[] {
  if (!isBrowser()) return [];
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) {
    saveCompetitions([demoCompetition]);
    return [demoCompetition];
  }

  try {
    const competitions = (JSON.parse(raw) as Competition[]).map(normalizeCompetition);
    safeSetItem(STORAGE_KEY, JSON.stringify(competitions));
    return competitions;
  } catch (error) {
    console.error("raceSail localStorage JSON migration failed", error);
    return [];
  }
}

function saveCompetitions(competitions: Competition[]) {
  if (!isBrowser()) return;
  if (safeSetItem(STORAGE_KEY, JSON.stringify(competitions))) {
    window.dispatchEvent(new Event("raceSail:storage"));
  }
}

export function getCompetitions() {
  if (!isBrowser()) return [];
  return readStorage();
}

export function getCompetitionById(id: string) {
  if (!isBrowser()) return undefined;
  return readStorage().find((competition) => competition.id === id);
}

export function saveCompetition(competition: Competition) {
  if (!isBrowser()) return competition;
  const normalized = normalizeCompetition({ ...competition, updatedAt: new Date().toISOString() });
  saveCompetitions([normalized, ...readStorage().filter((item) => item.id !== competition.id)]);
  return normalized;
}

export function updateCompetition(id: string, updater: (competition: Competition) => Competition) {
  if (!isBrowser()) return undefined;
  let updated: Competition | undefined;
  const competitions = readStorage().map((competition) => {
    if (competition.id !== id) return competition;
    updated = normalizeCompetition(updater(competition));
    return updated;
  });
  saveCompetitions(competitions);
  return updated;
}

export function deleteCompetition(id: string) {
  if (!isBrowser()) return;
  saveCompetitions(readStorage().filter((competition) => competition.id !== id));
}

export function resetDemoData() {
  if (!isBrowser()) return;
  saveCompetitions([demoCompetition]);
}

export function addLocalNotification(competitionId: string, notification: RaceNotification) {
  return updateCompetition(competitionId, (competition) => ({
    ...competition,
    notifications: [notification, ...(competition.notifications ?? [])],
    updatedAt: new Date().toISOString(),
  }));
}

export function clearCompetitionData() {
  if (!isBrowser()) return;
  safeRemoveItem(STORAGE_KEY);
  window.dispatchEvent(new Event("raceSail:storage"));
}

export const competitionStore = {
  list: getCompetitions,
  get: getCompetitionById,
  create: saveCompetition,
  update: updateCompetition,
  delete: deleteCompetition,
  resetDemo: resetDemoData,
  clear: clearCompetitionData,
  notify: addLocalNotification,
};
