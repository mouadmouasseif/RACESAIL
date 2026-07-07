"use client";

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type FirestoreSettings,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

type FirebaseClient = {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
};

let client: FirebaseClient | null = null;
let initializationError: string | null = null;

export function getMissingFirebaseEnv() {
  return Object.entries(firebaseConfig)
    .filter(([key, value]) => key !== "measurementId" && !value)
    .map(([key]) => key);
}

export function notifyFirebaseError(message = "Unable to synchronize with Firebase.") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("raceSail:firebase-error", { detail: message }));
}

function validateFirebaseConfig() {
  console.table(firebaseConfig);
  const missing = getMissingFirebaseEnv();
  if (missing.length > 0) {
    initializationError = "Missing Firebase environment variables.";
    throw new Error("Firebase configuration is incomplete.");
  }
}

export function getFirebaseClient() {
  if (typeof window === "undefined") return null;
  if (client) return client;

  try {
    validateFirebaseConfig();
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    let db: Firestore;
    try {
      const firestoreSettings: FirestoreSettings & { useFetchStreams?: boolean } = {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      };
      db = initializeFirestore(app, firestoreSettings);
    } catch (error) {
      console.warn("Firestore long-polling initialization fallback", error);
      db = getFirestore(app);
    }

    client = {
      app,
      db,
      auth: getAuth(app),
      storage: getStorage(app),
    };
    initializationError = null;
    return client;
  } catch (error) {
    console.error(error);
    notifyFirebaseError(initializationError ?? "Unable to initialize Firebase.");
    return null;
  }
}

export function getFirebaseStatus() {
  const missing = getMissingFirebaseEnv();
  return {
    initialized: Boolean(client),
    error: initializationError,
    missing,
    projectId: firebaseConfig.projectId ?? "",
    authDomain: firebaseConfig.authDomain ?? "",
    storageBucket: firebaseConfig.storageBucket ?? "",
    currentUser: client?.auth.currentUser?.email ?? client?.auth.currentUser?.uid ?? "Not signed in",
  };
}

const firebaseClient = typeof window !== "undefined" ? getFirebaseClient() : null;

export const app = firebaseClient?.app ?? null;
export const db = firebaseClient?.db ?? null;
export const auth = firebaseClient?.auth ?? null;
export const storage = firebaseClient?.storage ?? null;

export default app;
