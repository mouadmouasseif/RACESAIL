"use client";

import { collection, doc, setDoc } from "firebase/firestore";
import type { Athlete, Competition, Race, RaceResult } from "@/types";
import { getFirebaseClient, notifyFirebaseError } from "@/lib/firebase";

const SYNC_QUEUE_KEY = "raceSail.firebaseSyncQueue";

type SyncQueueItem =
  | { id: string; type: "competition"; competition: Competition; createdAt: string }
  | { id: string; type: "athlete"; competitionId: string; athlete: Athlete; createdAt: string }
  | { id: string; type: "race"; competitionId: string; race: Race; createdAt: string }
  | { id: string; type: "result"; competitionId: string; result: RaceResult; createdAt: string };

function isBrowser() {
  return typeof window !== "undefined";
}

function createQueueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readQueue(): SyncQueueItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) as SyncQueueItem[] : [];
  } catch (error) {
    console.error("Unable to read Firebase sync queue", error);
    return [];
  }
}

function writeQueue(queue: SyncQueueItem[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("raceSail:sync-queue"));
  } catch (error) {
    console.error("Unable to write Firebase sync queue", error);
  }
}

function cleanForFirestore<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cleanForFirestore(item)) as T;

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanForFirestore(item)]),
    ) as T;
  }

  return value;
}

function resultDocumentId(result: RaceResult) {
  return `${result.raceNumber}-${encodeURIComponent(result.sailNumber)}`;
}

function queueItem(item: SyncQueueItem) {
  writeQueue([...readQueue(), item]);
}

export function queueCompetition(competition: Competition) {
  queueItem({ id: createQueueId("competition"), type: "competition", competition, createdAt: new Date().toISOString() });
}

export function queueAthlete(competitionId: string, athlete: Athlete) {
  queueItem({ id: createQueueId("athlete"), type: "athlete", competitionId, athlete, createdAt: new Date().toISOString() });
}

export function queueRace(competitionId: string, race: Race) {
  queueItem({ id: createQueueId("race"), type: "race", competitionId, race, createdAt: new Date().toISOString() });
}

export function queueResult(competitionId: string, result: RaceResult) {
  queueItem({ id: createQueueId("result"), type: "result", competitionId, result, createdAt: new Date().toISOString() });
}

export function getPendingChanges() {
  return readQueue();
}

export function clearPendingChanges() {
  writeQueue([]);
}

async function writeCompetition(competition: Competition) {
  const client = getFirebaseClient();
  if (!client) throw new Error("Firebase is not initialized.");
  const { db } = client;

  await setDoc(doc(db, "competitions", competition.id), cleanForFirestore({
    ...competition,
    athletes: [],
    races: [],
    notifications: [],
  }));

  await Promise.all([
    ...competition.athletes.map((athlete) =>
      setDoc(doc(collection(db, "competitions", competition.id, "athletes"), athlete.id), cleanForFirestore(athlete)),
    ),
    ...competition.races.map((race) =>
      setDoc(doc(collection(db, "competitions", competition.id, "races"), String(race.raceNumber)), cleanForFirestore(race)),
    ),
    ...competition.athletes.flatMap((athlete) =>
      Object.values(athlete.results ?? {}).map((result) =>
        setDoc(doc(collection(db, "competitions", competition.id, "results"), resultDocumentId(result)), cleanForFirestore(result)),
      ),
    ),
    ...(competition.notifications ?? []).map((notification) =>
      setDoc(doc(collection(db, "competitions", competition.id, "notifications"), notification.id), cleanForFirestore(notification)),
    ),
  ]);
}

async function writeQueueItem(item: SyncQueueItem) {
  const client = getFirebaseClient();
  if (!client) throw new Error("Firebase is not initialized.");
  const { db } = client;

  if (item.type === "competition") {
    await writeCompetition(item.competition);
    return;
  }

  if (item.type === "athlete") {
    await setDoc(
      doc(collection(db, "competitions", item.competitionId, "athletes"), item.athlete.id),
      cleanForFirestore(item.athlete),
    );
    return;
  }

  if (item.type === "race") {
    await setDoc(
      doc(collection(db, "competitions", item.competitionId, "races"), String(item.race.raceNumber)),
      cleanForFirestore(item.race),
    );
    return;
  }

  await setDoc(
    doc(collection(db, "competitions", item.competitionId, "results"), resultDocumentId(item.result)),
    cleanForFirestore(item.result),
  );
}

export async function syncPendingChanges() {
  if (!isBrowser() || !window.navigator.onLine) return { synced: 0, pending: readQueue().length };

  const queue = readQueue();
  const remaining: SyncQueueItem[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await writeQueueItem(item);
      synced += 1;
    } catch (error) {
      console.error("Unable to synchronize with Firebase.", error);
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  if (remaining.length > 0) notifyFirebaseError("Unable to synchronize with Firebase.");
  return { synced, pending: remaining.length };
}
