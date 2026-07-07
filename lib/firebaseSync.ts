"use client";

import { collection, doc, setDoc } from "firebase/firestore";
import type { Athlete, Competition, Race, RaceNotification, RaceResult } from "@/types";
import { getFirebaseClient, notifyFirebaseError } from "@/lib/firebase";
import {
  addQueuedWrite,
  clearFirebaseSyncQueue,
  getQueuedWrites,
  removeQueuedWrite,
  sanitizeQueuePayload,
  type QueuePayload,
  type QueuedWrite,
} from "@/lib/indexedDbQueue";

function isBrowser() {
  return typeof window !== "undefined";
}

function resultDocumentId(result: RaceResult) {
  return `${result.raceNumber}-${encodeURIComponent(result.sailNumber)}`;
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

function withoutLargeFields<T extends Record<string, unknown>>(payload: T) {
  return sanitizeQueuePayload(payload) as QueuePayload;
}

function competitionMetadata(competition: Competition) {
  return withoutLargeFields({
    id: competition.id,
    name: competition.name,
    clubName: competition.clubName,
    clubLogo: logoReference(competition.clubLogo),
    competitionLogo: logoReference(competition.competitionLogo),
    location: competition.location,
    date: competition.date,
    boatClass: competition.boatClass,
    raceCount: competition.raceCount,
    scoringSystem: competition.scoringSystem,
    createdAt: competition.createdAt,
    updatedAt: competition.updatedAt,
  });
}

function athletePayload(athlete: Athlete) {
  return withoutLargeFields({
    ...athlete,
    clubLogo: logoReference(athlete.clubLogo),
    results: {},
  });
}

function racePayload(race: Race) {
  return withoutLargeFields({
    ...race,
    results: [],
  });
}

function logoReference(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("data:image") || value.startsWith("blob:")) return undefined;
  return value;
}

async function queueWrite(type: string, path: string, documentId: string, payload: QueuePayload) {
  await addQueuedWrite({ type, path, documentId, payload });
}

export async function queueCompetition(competition: Competition) {
  await queueWrite("competition:update", "competitions", competition.id, competitionMetadata(competition));
}

export async function queueAthlete(competitionId: string, athlete: Athlete) {
  await queueWrite("athlete:update", `competitions/${competitionId}/athletes`, athlete.id, athletePayload(athlete));
}

export async function queueRace(competitionId: string, race: Race) {
  await queueWrite("race:update", `competitions/${competitionId}/races`, String(race.raceNumber), racePayload(race));
}

export async function queueResult(competitionId: string, athleteId: string, result: RaceResult) {
  await queueWrite("result:update", `competitions/${competitionId}/results`, resultDocumentId(result), {
    competitionId,
    athleteId,
    raceNumber: result.raceNumber,
    result: sanitizeQueuePayload(result),
  });
}

export async function queueNotification(notification: RaceNotification) {
  await queueWrite(
    "notification:update",
    `competitions/${notification.competitionId}/notifications`,
    notification.id,
    sanitizeQueuePayload(notification),
  );
}

export async function getPendingChanges() {
  return getQueuedWrites();
}

export async function clearPendingChanges() {
  await clearFirebaseSyncQueue();
}

async function writeQueueItem(item: QueuedWrite) {
  const client = getFirebaseClient();
  if (!client) throw new Error("Firebase is not initialized.");

  await setDoc(
    doc(collection(client.db, item.path), item.documentId),
    cleanForFirestore(item.payload),
    { merge: true },
  );
}

export async function syncPendingChanges() {
  if (!isBrowser() || !window.navigator.onLine) {
    return { synced: 0, pending: (await getQueuedWrites()).length };
  }

  const queue = await getQueuedWrites();
  let synced = 0;

  for (const item of queue) {
    try {
      await writeQueueItem(item);
      await removeQueuedWrite(item.id);
      synced += 1;
    } catch (error) {
      console.error("Unable to synchronize with Firebase.", error);
      notifyFirebaseError("Unable to synchronize with Firebase.");
      return { synced, pending: (await getQueuedWrites()).length };
    }
  }

  return { synced, pending: (await getQueuedWrites()).length };
}

export { clearFirebaseSyncQueue };
