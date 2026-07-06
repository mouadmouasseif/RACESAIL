"use client";

import type { Athlete, Competition, Race, RaceNotification, RaceResult } from "@/types";

type Unsubscribe = () => void;

function firebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return config.apiKey && config.projectId && config.appId ? config : null;
}

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig());
}

async function getFirestoreClient() {
  const config = firebaseConfig();
  if (!config || typeof window === "undefined") return null;

  const [{ initializeApp, getApps }, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/firestore"),
  ]);

  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return { db: firestore.getFirestore(app), firestore };
}

export async function syncCompetitionToFirestore(competition: Competition) {
  const client = await getFirestoreClient();
  if (!client) return;
  const { db, firestore } = client;
  const { doc, setDoc, collection } = firestore;

  await setDoc(doc(db, "competitions", competition.id), {
    ...competition,
    athletes: [],
    races: [],
  });

  await Promise.all([
    ...competition.athletes.map((athlete) =>
      setDoc(doc(collection(db, "competitions", competition.id, "athletes"), athlete.id), athlete),
    ),
    ...competition.races.map((race) =>
      setDoc(doc(collection(db, "competitions", competition.id, "races"), String(race.raceNumber)), race),
    ),
    ...competition.athletes.flatMap((athlete) =>
      Object.values(athlete.results).map((result) =>
        setDoc(
          doc(collection(db, "competitions", competition.id, "results"), `${result.raceNumber}-${athlete.sailNumber}`),
          result,
        ),
      ),
    ),
  ]);
}

export async function createRaceNotification(notification: RaceNotification) {
  const client = await getFirestoreClient();
  if (!client) return;
  const { db, firestore } = client;
  const { doc, setDoc, collection } = firestore;
  await setDoc(doc(collection(db, "competitions", notification.competitionId, "notifications"), notification.id), notification);
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
