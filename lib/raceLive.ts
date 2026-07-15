"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  Competition,
  MarkType,
  ProtestRecord,
  RaceLiveState,
  RaceMarkRecord,
  RaceStartListItem,
  StartCountdownMode,
  UFDRecord,
} from "@/types";
import { getFirebaseClient, notifyFirebaseError } from "@/lib/firebase";
import { getClassFlagCode } from "@/lib/sailingFlags";

export type LiveRaceData = {
  state?: RaceLiveState;
  marks: RaceMarkRecord[];
  ufd: UFDRecord[];
  protests: ProtestRecord[];
  startList: RaceStartListItem[];
};

const emptyLiveData: LiveRaceData = {
  marks: [],
  ufd: [],
  protests: [],
  startList: [],
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function liveRaceId(competitionId: string, raceNumber: number) {
  return `${competitionId}-race-${raceNumber}`;
}

function localKey(competitionId: string, raceId: string) {
  return `raceSail.liveRace.${competitionId}.${raceId}`;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readLocalLiveData(competitionId: string, raceId: string): LiveRaceData {
  if (!isBrowser()) return { ...emptyLiveData };
  try {
    const raw = window.localStorage.getItem(localKey(competitionId, raceId));
    return raw ? { ...emptyLiveData, ...JSON.parse(raw) } : { ...emptyLiveData };
  } catch (error) {
    console.warn("Unable to read local live race data.", error);
    return { ...emptyLiveData };
  }
}

function writeLocalLiveData(competitionId: string, raceId: string, data: LiveRaceData) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(localKey(competitionId, raceId), JSON.stringify(data));
  } catch (error) {
    console.warn("Unable to save local live race data.", error);
  }
}

function canUseFirebase() {
  return isBrowser() && window.navigator.onLine;
}

function livePath(competitionId: string, raceId: string) {
  return `competitions/${competitionId}/liveRaces/${raceId}`;
}

export function createInitialLiveState(competition: Competition, raceNumber: number): RaceLiveState {
  const now = Date.now();
  const raceId = liveRaceId(competition.id, raceNumber);
  return {
    raceId,
    competitionId: competition.id,
    raceNumber,
    status: "not_started",
    countdownMode: "5min",
    countdownSeconds: 300,
    selectedFlagCode: "P",
    activeFlags: [getClassFlagCode(competition.boatClass), "Orange"],
    createdAt: now,
    updatedAt: now,
  };
}

export function createStartList(competition: Competition, raceId: string): RaceStartListItem[] {
  return competition.athletes.map((athlete) => ({
    id: `${raceId}-${athlete.sailNumber}`,
    competitionId: competition.id,
    raceId,
    sailNumber: athlete.sailNumber,
    sailorName: `${athlete.firstName} ${athlete.lastName}`.trim(),
    club: athlete.clubName,
    nationality: athlete.nationality,
    boatClass: athlete.boatClass,
    status: "ready",
  }));
}

export async function ensureLiveRace(competition: Competition, raceNumber: number) {
  const raceId = liveRaceId(competition.id, raceNumber);
  const localData = readLocalLiveData(competition.id, raceId);
  const state = localData.state ?? createInitialLiveState(competition, raceNumber);
  const startList = localData.startList.length > 0 ? localData.startList : createStartList(competition, raceId);
  writeLocalLiveData(competition.id, raceId, { ...localData, state, startList });

  if (!canUseFirebase()) return { ...localData, state, startList };

  try {
    const { db } = getFirebaseClient();
    const stateRef = doc(db, livePath(competition.id, raceId));
    const existing = await getDoc(stateRef);
    if (!existing.exists()) {
      await setDoc(stateRef, state, { merge: true });
    }
    await Promise.all(
      startList.map((item) =>
        setDoc(doc(db, `${livePath(competition.id, raceId)}/startList/${item.sailNumber}`), item, { merge: true }),
      ),
    );
  } catch (error) {
    console.warn("Unable to prepare Firebase live race. Local state kept.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }

  return { ...localData, state, startList };
}

export async function updateLiveRaceState(competitionId: string, raceId: string, patch: Partial<RaceLiveState>) {
  const localData = readLocalLiveData(competitionId, raceId);
  const state = {
    ...(localData.state ?? { raceId, competitionId, raceNumber: 1, status: "not_started", countdownMode: "5min", countdownSeconds: 300, activeFlags: [], createdAt: Date.now() }),
    ...patch,
    updatedAt: Date.now(),
  } as RaceLiveState;
  writeLocalLiveData(competitionId, raceId, { ...localData, state });

  if (!canUseFirebase()) return state;

  try {
    await setDoc(doc(getFirebaseClient().db, livePath(competitionId, raceId)), state, { merge: true });
  } catch (error) {
    console.warn("Unable to update live race state.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }

  return state;
}

async function writeStartListStatus(competitionId: string, raceId: string, sailNumber: string, status: RaceStartListItem["status"]) {
  const localData = readLocalLiveData(competitionId, raceId);
  const startList = localData.startList.map((item) => item.sailNumber === sailNumber ? { ...item, status } : item);
  writeLocalLiveData(competitionId, raceId, { ...localData, startList });

  if (!canUseFirebase()) return;

  try {
    await setDoc(doc(getFirebaseClient().db, `${livePath(competitionId, raceId)}/startList/${sailNumber}`), { status }, { merge: true });
  } catch (error) {
    console.warn("Unable to update live start list.", error);
  }
}

async function markPosition(competitionId: string, raceId: string, markType: MarkType) {
  if (!canUseFirebase()) {
    return readLocalLiveData(competitionId, raceId).marks.filter((mark) => mark.markType === markType).length + 1;
  }

  try {
    const snapshot = await getDocs(collection(getFirebaseClient().db, `${livePath(competitionId, raceId)}/marks`));
    return snapshot.docs.filter((item) => (item.data() as RaceMarkRecord).markType === markType).length + 1;
  } catch {
    return readLocalLiveData(competitionId, raceId).marks.filter((mark) => mark.markType === markType).length + 1;
  }
}

export async function markBoatStarted({ competitionId, raceId, sailNumber }: { competitionId: string; raceId: string; sailNumber: string }) {
  const now = Date.now();
  const localData = readLocalLiveData(competitionId, raceId);
  if (!localData.state?.firstBoatStartedAt) {
    await updateLiveRaceState(competitionId, raceId, { firstBoatStartedAt: now });
  }
  await writeStartListStatus(competitionId, raceId, sailNumber, "started");
}

export async function recordMark({ competitionId, raceId, sailNumber, markType }: { competitionId: string; raceId: string; sailNumber: string; markType: MarkType }) {
  const timestamp = Date.now();
  const record: RaceMarkRecord = {
    id: createId(markType),
    raceId,
    sailNumber,
    markType,
    position: await markPosition(competitionId, raceId, markType),
    timestamp,
  };

  const localData = readLocalLiveData(competitionId, raceId);
  const marks = [...localData.marks, record];
  writeLocalLiveData(competitionId, raceId, { ...localData, marks });

  if (markType === "finish") {
    const state = localData.state;
    const firstBoatFinishedAt = state?.firstBoatFinishedAt ?? timestamp;
    const firstBoatStartedAt = state?.firstBoatStartedAt ?? state?.officialStartAt ?? timestamp;
    await updateLiveRaceState(competitionId, raceId, {
      firstBoatStartedAt,
      firstBoatFinishedAt,
      lastBoatFinishedAt: timestamp,
      raceDurationSeconds: Math.max(0, Math.round((timestamp - firstBoatStartedAt) / 1000)),
    });
    await writeStartListStatus(competitionId, raceId, sailNumber, "finished");
  }

  if (!canUseFirebase()) return record;

  try {
    await setDoc(doc(getFirebaseClient().db, `${livePath(competitionId, raceId)}/marks/${record.id}`), record);
  } catch (error) {
    console.warn("Unable to record mark in Firebase.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }

  return record;
}

export async function markUFD({ competitionId, raceId, sailNumber, note }: { competitionId: string; raceId: string; sailNumber: string; note?: string }) {
  const record: UFDRecord = { id: createId("ufd"), raceId, sailNumber, timestamp: Date.now(), note };
  const localData = readLocalLiveData(competitionId, raceId);
  writeLocalLiveData(competitionId, raceId, { ...localData, ufd: [...localData.ufd, record] });
  await writeStartListStatus(competitionId, raceId, sailNumber, "ufd");

  if (!canUseFirebase()) return record;

  try {
    await setDoc(doc(getFirebaseClient().db, `${livePath(competitionId, raceId)}/ufd/${record.id}`), record);
  } catch (error) {
    console.warn("Unable to record UFD in Firebase.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }

  return record;
}

export async function createProtest(input: {
  competitionId: string;
  raceId: string;
  protesterSailNumber: string;
  protestedSailNumber: string;
  witnessSailNumber?: string;
  reason?: string;
}) {
  const protester = input.protesterSailNumber.trim();
  const protested = input.protestedSailNumber.trim();
  if (!protester || !protested) throw new Error("Protester and protested sail numbers are required.");
  if (protester === protested) throw new Error("Protester and protested sail numbers must be different.");

  const now = Date.now();
  const record: ProtestRecord = {
    id: createId("protest"),
    raceId: input.raceId,
    protesterSailNumber: protester,
    protestedSailNumber: protested,
    witnessSailNumber: input.witnessSailNumber?.trim() || undefined,
    reason: input.reason?.trim() || undefined,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const localData = readLocalLiveData(input.competitionId, input.raceId);
  writeLocalLiveData(input.competitionId, input.raceId, { ...localData, protests: [...localData.protests, record] });

  if (!canUseFirebase()) return record;

  try {
    await setDoc(doc(getFirebaseClient().db, `${livePath(input.competitionId, input.raceId)}/protests/${record.id}`), record);
  } catch (error) {
    console.warn("Unable to record protest in Firebase.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }

  return record;
}

export async function subscribeLiveRaceData(
  competitionId: string,
  raceId: string,
  onChange: (data: LiveRaceData) => void,
): Promise<Unsubscribe> {
  const emitLocal = () => onChange(readLocalLiveData(competitionId, raceId));
  if (!canUseFirebase()) {
    emitLocal();
    const timer = window.setInterval(emitLocal, 2000);
    return () => window.clearInterval(timer);
  }

  try {
    const { db } = getFirebaseClient();
    const state: LiveRaceData = { ...emptyLiveData };
    const emit = () => onChange({ ...state });
    const onError = (error: Error) => {
      console.warn("Unable to subscribe to live race.", error);
      notifyFirebaseError("Unable to synchronize with Firebase.");
      emitLocal();
    };

    const unsubscribers = [
      onSnapshot(doc(db, livePath(competitionId, raceId)), (snapshot) => {
        state.state = snapshot.exists() ? snapshot.data() as RaceLiveState : readLocalLiveData(competitionId, raceId).state;
        emit();
      }, onError),
      onSnapshot(collection(db, `${livePath(competitionId, raceId)}/marks`), (snapshot) => {
        state.marks = snapshot.docs.map((item) => item.data() as RaceMarkRecord).sort((a, b) => a.timestamp - b.timestamp);
        emit();
      }, onError),
      onSnapshot(collection(db, `${livePath(competitionId, raceId)}/ufd`), (snapshot) => {
        state.ufd = snapshot.docs.map((item) => item.data() as UFDRecord).sort((a, b) => a.timestamp - b.timestamp);
        emit();
      }, onError),
      onSnapshot(collection(db, `${livePath(competitionId, raceId)}/protests`), (snapshot) => {
        state.protests = snapshot.docs.map((item) => item.data() as ProtestRecord).sort((a, b) => b.createdAt - a.createdAt);
        emit();
      }, onError),
      onSnapshot(collection(db, `${livePath(competitionId, raceId)}/startList`), (snapshot) => {
        state.startList = snapshot.docs.map((item) => item.data() as RaceStartListItem).sort((a, b) => a.sailNumber.localeCompare(b.sailNumber));
        emit();
      }, onError),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  } catch (error) {
    console.warn("Unable to initialize live race subscription.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
    emitLocal();
    return () => {};
  }
}

export function countdownSecondsForMode(mode: StartCountdownMode) {
  if (mode === "3min") return 180;
  if (mode === "1min") return 60;
  if (mode === "direct") return 0;
  return 300;
}

export function formatRaceTime(seconds?: number) {
  if (seconds === undefined || Number.isNaN(seconds)) return "-";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}
