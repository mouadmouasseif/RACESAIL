"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import type { Athlete, BoatClass, Competition, Race, RaceNotification, RaceResult, Sex } from "@/types";
import { getAthleteCategory, getFlagEmoji } from "@/lib/flags";
import { getFinishedRaceCount, rankAthletes } from "@/lib/scoring";
import { getFirebaseClient, getFirebaseStatus, notifyFirebaseError } from "@/lib/firebase";
import { queueAthlete, queueCompetition, queueNotification, queueRace, queueResult, syncPendingChanges } from "@/lib/firebaseSync";

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

async function logoReference(value: string | undefined, path: string) {
  if (!value) return undefined;
  if (value.startsWith("blob:")) return undefined;
  if (!value.startsWith("data:image")) return value;

  const client = getFirebaseClient();
  if (!client) return undefined;

  const logoRef = ref(client.storage, path);
  await uploadString(logoRef, value, "data_url");
  return getDownloadURL(logoRef);
}

async function competitionMetadata(competition: Competition) {
  const [clubLogo, competitionLogo] = await Promise.all([
    logoReference(competition.clubLogo, `logos/competitions/${competition.id}/club-logo`),
    logoReference(competition.competitionLogo, `logos/competitions/${competition.id}/competition-logo`),
  ]);

  return cleanForFirestore({
    ...competition,
    clubLogo,
    competitionLogo,
    athletes: [],
    races: [],
    notifications: [],
  });
}

async function athleteDocument(competitionId: string, athlete: Athlete) {
  const clubLogo = await logoReference(athlete.clubLogo, `logos/competitions/${competitionId}/athletes/${athlete.id}-club-logo`);
  return cleanForFirestore({
    ...athlete,
    clubLogo,
    results: {},
  });
}

function raceDocument(race: Race) {
  return cleanForFirestore({
    ...race,
    results: [],
  });
}

function resultDocument(result: RaceResult) {
  return cleanForFirestore(result);
}

function notificationDocument(notification: RaceNotification) {
  return cleanForFirestore(notification);
}

async function queueSmallCompetitionWrites(competition: Competition) {
  await Promise.all([
    queueCompetition(competition),
    ...competition.athletes.map((athlete) => queueAthlete(competition.id, athlete)),
    ...competition.races.map((race) => queueRace(competition.id, race)),
    ...competition.athletes.flatMap((athlete) =>
      Object.values(athlete.results ?? {}).map((result) => queueResult(competition.id, athlete.id, result)),
    ),
    ...(competition.notifications ?? []).map((notification) => queueNotification(notification)),
  ]);
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
    await queueSmallCompetitionWrites(competition);
    return;
  }

  const client = getFirebaseClient();
  if (!client) {
    await queueSmallCompetitionWrites(competition);
    notifyFirebaseError("Missing Firebase environment variables.");
    return;
  }

  try {
    const { db } = client;
    await setDoc(doc(db, "competitions", competition.id), await competitionMetadata(competition), { merge: true });
    if (competition.isLivePublished && competition.publicCode) {
      await setDoc(doc(db, "liveCodes", competition.publicCode), {
        competitionId: competition.id,
        createdAt: competition.createdAt,
      }, { merge: true });
    }

    await Promise.all([
      ...competition.athletes.map(async (athlete) =>
        setDoc(
          doc(collection(db, "competitions", competition.id, "athletes"), athlete.id),
          await athleteDocument(competition.id, athlete),
          { merge: true },
        ),
      ),
      ...competition.races.map((race) =>
        setDoc(doc(collection(db, "competitions", competition.id, "races"), String(race.raceNumber)), raceDocument(race), { merge: true }),
      ),
      ...collectRaceResults(competition).map(([id, result]) =>
        setDoc(doc(collection(db, "competitions", competition.id, "results"), id), resultDocument(result), { merge: true }),
      ),
      ...(competition.notifications ?? []).map((notification) =>
        setDoc(doc(collection(db, "competitions", competition.id, "notifications"), notification.id), notificationDocument(notification), { merge: true }),
      ),
    ]);

    await syncPendingChanges();
  } catch (error) {
    console.error("Unable to synchronize with Firebase.", error);
    await queueSmallCompetitionWrites(competition);
    notifyFirebaseError("Unable to synchronize with Firebase.");
  }
}

export async function publishCompetitionLive(competition: Competition) {
  const client = getFirebaseClient();
  if (!client) {
    notifyFirebaseError("Firebase is not configured. Add environment variables in Vercel and redeploy.");
    return false;
  }

  const published = { ...competition, isLivePublished: true, updatedAt: new Date().toISOString() };
  try {
    await syncCompetitionToFirestore(published);
    await setDoc(doc(client.db, "liveCodes", published.publicCode), {
      competitionId: published.id,
      createdAt: published.createdAt,
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Unable to publish live results.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
    return false;
  }
}

export async function unpublishCompetitionLive(competition: Competition) {
  const client = getFirebaseClient();
  if (!client) {
    notifyFirebaseError("Firebase is not configured. Add environment variables in Vercel and redeploy.");
    return false;
  }

  try {
    await setDoc(doc(client.db, "competitions", competition.id), {
      isLivePublished: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    if (competition.publicCode) await deleteDoc(doc(client.db, "liveCodes", competition.publicCode));
    return true;
  } catch (error) {
    console.error("Unable to unpublish live results.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
    return false;
  }
}

export async function getCompetitionIdByPublicCode(publicCode: string) {
  const client = getFirebaseClient();
  if (!client) return undefined;

  try {
    const snapshot = await getDoc(doc(client.db, "liveCodes", publicCode.trim().toUpperCase()));
    if (!snapshot.exists()) return undefined;
    const data = snapshot.data() as { competitionId?: string };
    return data.competitionId;
  } catch (error) {
    console.error("Unable to load live code.", error);
    notifyFirebaseError("Unable to synchronize with Firebase.");
    return undefined;
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

    const competition = {
      id: competitionId,
      name: competitionData.name ?? "Live Competition",
      publicCode: competitionData.publicCode ?? "",
      isLivePublished: competitionData.isLivePublished ?? false,
      clubName: competitionData.clubName ?? "",
      clubLogo: competitionData.clubLogo,
      competitionLogo: competitionData.competitionLogo,
      location: competitionData.location ?? "",
      date: competitionData.date ?? new Date().toISOString().slice(0, 10),
      boatClass: competitionData.boatClass ?? "Optimist",
      raceCount,
      scoringSystem: "Low Point",
      athletes: [],
      races: raceSnapshot.docs.map((item) => item.data() as Race).sort((a, b) => a.raceNumber - b.raceNumber),
      notifications: notificationSnapshot.docs
        .map((item) => item.data() as RaceNotification)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      createdAt: competitionData.createdAt ?? new Date().toISOString(),
      updatedAt: competitionData.updatedAt ?? new Date().toISOString(),
    } satisfies Competition;

    return {
      ...competition,
      athletes: rankAthletes(athletes, raceCount, getFinishedRaceCount(competition.races)),
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
    await queueNotification(notification);
    notifyFirebaseError("Missing Firebase environment variables.");
    return;
  }

  try {
    await setDoc(
      doc(collection(client.db, "competitions", notification.competitionId, "notifications"), notification.id),
      notificationDocument(notification),
    );
  } catch (error) {
    console.error("Unable to synchronize with Firebase.", error);
    await queueNotification(notification);
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
