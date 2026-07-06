"use client";

import type { Athlete, BoatClass, Competition, Race, RaceNotification, RaceResult, Sex } from "@/types";
import { getAthleteCategory, getFlagEmoji } from "@/lib/flags";
import { rankAthletes } from "@/lib/scoring";

type Unsubscribe = () => void;

function firebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD5FfvUUMBybVKSv29PL27Wnj6vKkSy0iw",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "race-sail.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "race-sail",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "race-sail.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "625970678316",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:625970678316:web:f4c68325768a77e19a9f89",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-Y140YJG9JT",
  };

  return config.apiKey && config.projectId && config.appId ? config : null;
}

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig());
}

async function getFirebaseApp() {
  const config = firebaseConfig();
  if (!config || typeof window === "undefined") return null;

  const { initializeApp, getApps } = await import("firebase/app");
  return getApps().length ? getApps()[0] : initializeApp(config);
}

export async function initializeFirebaseAnalytics() {
  const app = await getFirebaseApp();
  if (!app) return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return null;
    return getAnalytics(app);
  } catch (error) {
    console.warn("Firebase Analytics is not available on this device", error);
    return null;
  }
}

async function getFirestoreClient() {
  const app = await getFirebaseApp();
  if (!app) return null;

  const firestore = await import("firebase/firestore");
  return { db: firestore.getFirestore(app), firestore };
}

function cleanForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cleanForFirestore(item)) as T;
  }

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
  const client = await getFirestoreClient();
  if (!client) return;
  const { db, firestore } = client;
  const { doc, setDoc, collection } = firestore;

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
}

export async function syncCompetitionsToFirestore(competitions: Competition[]) {
  await Promise.all(competitions.map((competition) => syncCompetitionToFirestore(competition)));
}

export async function getCompetitionFromFirestore(competitionId: string): Promise<Competition | undefined> {
  const client = await getFirestoreClient();
  if (!client) return undefined;

  const { db, firestore } = client;
  const { collection, doc, getDoc, getDocs } = firestore;
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
}

export async function createRaceNotification(notification: RaceNotification) {
  const client = await getFirestoreClient();
  if (!client) return;
  const { db, firestore } = client;
  const { doc, setDoc, collection } = firestore;
  await setDoc(doc(collection(db, "competitions", notification.competitionId, "notifications"), notification.id), cleanForFirestore(notification));
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
  const client = await getFirestoreClient();
  if (!client) return () => {};
  const { db, firestore } = client;
  const { collection, doc, onSnapshot } = firestore;

  const state: {
    competition?: Partial<Competition>;
    athletes: Athlete[];
    races: Race[];
    results: RaceResult[];
    notifications: RaceNotification[];
  } = { athletes: [], races: [], results: [], notifications: [] };

  const emit = () => onChange({ ...state });
  const unsubscribers: Unsubscribe[] = [
    onSnapshot(doc(db, "competitions", competitionId), (snapshot) => {
      state.competition = snapshot.exists() ? snapshot.data() as Partial<Competition> : undefined;
      emit();
    }),
    onSnapshot(collection(db, "competitions", competitionId, "athletes"), (snapshot) => {
      state.athletes = snapshot.docs.map((item) => item.data() as Athlete);
      emit();
    }),
    onSnapshot(collection(db, "competitions", competitionId, "races"), (snapshot) => {
      state.races = snapshot.docs.map((item) => item.data() as Race);
      emit();
    }),
    onSnapshot(collection(db, "competitions", competitionId, "results"), (snapshot) => {
      state.results = snapshot.docs.map((item) => item.data() as RaceResult);
      emit();
    }),
    onSnapshot(collection(db, "competitions", competitionId, "notifications"), (snapshot) => {
      state.notifications = snapshot.docs
        .map((item) => item.data() as RaceNotification)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      emit();
    }),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
