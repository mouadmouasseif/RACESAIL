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
import type { Athlete, BoatClass, Competition, Race, RaceNotification, RaceResult, Sex } from "@/types";
import { getAthleteCategory, getFlagEmoji } from "@/lib/flags";
import { rankAthletes } from "@/lib/scoring";
import { getFirebaseClient, getFirebaseStatus, notifyFirebaseError } from "@/lib/firebase";
import { queueCompetition, syncPendingChanges } from "@/lib/firebaseSync";

export function isFirebaseConfigured() {
  return getFirebaseStatus().missing.length === 0;
}

export async function initializeFirebaseAnalytics() {
  const client = getFirebaseClient();
  if (!client) return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return null;
    return getAnalytics(client.app);
  } catch (error) {
    console.warn("Firebase Analytics is not available on this device", error);
    return null;
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

function collectRaceResults(competition: Competition) {
  const results = new Map<string, RaceResult>();

  competition.athletes.forEach((athlete) => {
    Object.values(athlete.results ?? {}).forEach((result) => {
      results.set(resultDocumentId(result), result);
    });
  });

  competition.races.forEach((race) => {
    race.results.forEach((result) => {
      results.set(resultDocumentId(result), result);
    });
  });

  return Array.from(results.entries());
}

export function migrateFirebaseAthlete(athlete: Partial<Athlete>): Athlete {
  return {
    id: athlete.id ?? `athlete-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    firstName: athlete.firstName ?? "",
    lastName: athlete.lastName ?? "",
    age: athlete.age ?? 0,
    sex: (athlete.sex as Sex) || "M",
    category: athlete.category || getAthleteCategory(athlete.age ?? 0),
    nationality: athlete.nationality ?? "",
    flag: getFlagEmoji(athlete.nationality ?? ""),
    clubName: athlete.clubName ?? "",
    clubLogo: athlete.clubLogo,
    sailNumber: athlete.sailNumber ?? "",
    boatClass: (athlete.boatClass as BoatClass) || "Optimist",
    licenseNumber: athlete.licenseNumber,
    results: athlete.results ?? {},
    total: athlete.total ?? 0,
    discard: athlete.discard ?? 0,
    net: athlete.net ?? 0,
    rank: athlete.rank ?? 0,
  };
}

export async function syncCompetitionToFirestore(competition: Competition) {
  if (typeof window === "undefined") return;

  if (!window.navigator.onLine) {
    queueCompetition(competition);
    return;
  }

  const client = getFirebaseClient();
  if (!client) {
    queueCompetition(competition);
    notifyFirebaseError("Missing Firebase environment variables.");
    return;
  }

  try {
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
      ...collectRaceResults(competition).map(([id, result]) =>
        setDoc(doc(collection(db, "competitions", competition.id, "results"), id), cleanForFirestore(result)),
      ),
      ...(competition.notifications ?? []).map((notification) =>
        setDoc(doc(collection(db, "competitions", competition.id, "notifications"), notification.id), cleanForFirestore(notification)),
      ),
    ]);

    await syncPendingChanges();
  } catch (error) {
    console.error("Unable to synchronize with Firebase.", error);
    queueCompetition(competition);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }
}

export async function syncCompetitionsToFirestore(competitions: Competition[]) {
  for (const competition of competitions) {
    await syncCompetitionToFirestore(competition);
  }
}

export async function getCompetitionFromFirestore(competitionId: string): Promise<Competition | undefined> {
  if (typeof window === "undefined") return undefined;

  const client = getFirebaseClient();
  if (!client) return undefined;

  try {
    const { db } = client;
    const competitionSnapshot = await getDoc(doc(db, "competitions", competitionId));
    if (!competitionSnapshot.exists()) return undefined;

    const [athleteSnapshot, raceSnapshot, resultSnapshot, notificationSnapshot] = await Promise.all([
      getDocs(collection(db, "competitions", competitionId, "athletes")),
      getDocs(collection(db, "competitions", competitionId, "races")),
      getDocs(collection(db, "competitions", competitionId, "results")),
      getDocs(collection(db, "competitions", competitionId, "notifications")),
    ]);

    const competitionData = competitionSnapshot.data() as Partial<Competition>;
    const raceCount = Number(competitionData.raceCount) || 1;
    const results = resultSnapshot.docs.map((item) => item.data() as RaceResult);
    const athletes = athleteSnapshot.docs.map((item) => {
      const athlete = migrateFirebaseAthlete(item.data() as Partial<Athlete>);
      return {
        ...athlete,
        results: Object.fromEntries(
          results
            .filter((result) => result.sailNumber === athlete.sailNumber)
            .map((result) => [result.raceNumber, result]),
        ),
      };
    });

    return {
      id: competitionId,
      name: competitionData.name ?? "Live Competition",
      clubName: competitionData.clubName ?? "",
      clubLogo: competitionData.clubLogo,
      competitionLogo: competitionData.competitionLogo,
      location: competitionData.location ?? "",
      date: competitionData.date ?? new Date().toISOString().slice(0, 10),
      boatClass: competitionData.boatClass ?? "Optimist",
      raceCount,
      scoringSystem: "Low Point",
      athletes: rankAthletes(athletes, raceCount),
      races: raceSnapshot.docs.map((item) => item.data() as Race).sort((a, b) => a.raceNumber - b.raceNumber),
      notifications: notificationSnapshot.docs
        .map((item) => item.data() as RaceNotification)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      createdAt: competitionData.createdAt ?? new Date().toISOString(),
      updatedAt: competitionData.updatedAt ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error("Unable to load Firebase competition.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
    return undefined;
  }
}

export async function createRaceNotification(notification: RaceNotification) {
  if (typeof window === "undefined") return;

  const client = getFirebaseClient();
  if (!client) {
    notifyFirebaseError("Missing Firebase environment variables.");
    return;
  }

  try {
    await setDoc(
      doc(collection(client.db, "competitions", notification.competitionId, "notifications"), notification.id),
      cleanForFirestore(notification),
    );
  } catch (error) {
    console.error("Unable to synchronize with Firebase.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }
}

export async function subscribeToLiveCompetition(
  competitionId: string,
  onChange: (payload: {
    competition?: Partial<Competition>;
    athletes: Athlete[];
    races: Race[];
    results: RaceResult[];
    notifications: RaceNotification[];
  }) => void,
): Promise<Unsubscribe> {
  if (typeof window === "undefined") return () => {};

  const client = getFirebaseClient();
  if (!client) return () => {};

  try {
    const { db } = client;
    const state: {
      competition?: Partial<Competition>;
      athletes: Athlete[];
      races: Race[];
      results: RaceResult[];
      notifications: RaceNotification[];
    } = { athletes: [], races: [], results: [], notifications: [] };

    const emit = () => onChange({ ...state });
    const onError = (error: Error) => {
      console.error("Unable to synchronize with Firebase.", error);
      notifyFirebaseError("Unable to synchronize with Firebase.");
    };

    const unsubscribers: Unsubscribe[] = [
      onSnapshot(doc(db, "competitions", competitionId), (snapshot) => {
        state.competition = snapshot.exists() ? snapshot.data() as Partial<Competition> : undefined;
        emit();
      }, onError),
      onSnapshot(collection(db, "competitions", competitionId, "athletes"), (snapshot) => {
        state.athletes = snapshot.docs.map((item) => item.data() as Athlete);
        emit();
      }, onError),
      onSnapshot(collection(db, "competitions", competitionId, "races"), (snapshot) => {
        state.races = snapshot.docs.map((item) => item.data() as Race);
        emit();
      }, onError),
      onSnapshot(collection(db, "competitions", competitionId, "results"), (snapshot) => {
        state.results = snapshot.docs.map((item) => item.data() as RaceResult);
        emit();
      }, onError),
      onSnapshot(collection(db, "competitions", competitionId, "notifications"), (snapshot) => {
        state.notifications = snapshot.docs
          .map((item) => item.data() as RaceNotification)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        emit();
      }, onError),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  } catch (error) {
    console.error("Unable to synchronize with Firebase.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
    return () => {};
  }
}
