"use client";

import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
  type FirestoreSettings,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const developmentFallbackConfig: FirebaseOptions = {
  apiKey: "AIzaSyD5FfvUUMBybVKSv29PL27Wnj6vKkSy0iw",
  authDomain: "race-sail.firebaseapp.com",
  projectId: "race-sail",
  storageBucket: "race-sail.appspot.com",
  messagingSenderId: "625970678316",
  appId: "1:625970678316:web:f4c68325768a77e19a9f89",
  measurementId: "G-Y140YJG9JT",
};

const requiredEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const optionalEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
] as const;

export const firebaseConfig: FirebaseOptions = {
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

function envValue(key: string) {
  return process.env[key];
}

function hasRequiredConfig(config: FirebaseOptions) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function resolvedConfig() {
  if (hasRequiredConfig(firebaseConfig)) return firebaseConfig;
  if (process.env.NODE_ENV === "development") return { ...developmentFallbackConfig, ...firebaseConfig };
  return firebaseConfig;
}

export function getFirebaseConfigStatus() {
  const missingRequired = requiredEnvKeys.filter((key) => !envValue(key));
  const missingOptional = optionalEnvKeys.filter((key) => !envValue(key));
  const usingDevelopmentFallback = process.env.NODE_ENV === "development" && missingRequired.length > 0;

  if (process.env.NODE_ENV === "development") {
    console.table({
      apiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      appId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    });
  }

  return {
    valid: missingRequired.length === 0 || usingDevelopmentFallback,
    syncEnabled: missingRequired.length === 0 || usingDevelopmentFallback,
    missingRequired,
    missingOptional,
    usingDevelopmentFallback,
    message: missingRequired.length > 0 && !usingDevelopmentFallback
      ? "Firebase is not configured. Add environment variables in Vercel and redeploy."
      : "",
    projectId: resolvedConfig().projectId ?? "",
    authDomain: resolvedConfig().authDomain ?? "",
    storageBucket: resolvedConfig().storageBucket ?? "",
  };
}

export function getMissingFirebaseEnv() {
  return getFirebaseConfigStatus().missingRequired;
}

export function notifyFirebaseError(message = "Unable to synchronize with Firebase.") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("raceSail:firebase-error", { detail: message }));
}

export function getFirebaseClient() {
  if (typeof window === "undefined") return null;
  if (client) return client;

  const status = getFirebaseConfigStatus();
  if (!status.valid) {
    initializationError = status.message;
    notifyFirebaseError(status.message);
    return null;
  }

  try {
    const config = resolvedConfig();
    const app = getApps().length > 0 ? getApp() : initializeApp(config);

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
    initializationError = "Unable to initialize Firebase.";
    notifyFirebaseError(initializationError);
    return null;
  }
}

export function getFirebaseStatus() {
  const configStatus = getFirebaseConfigStatus();
  return {
    initialized: Boolean(client),
    error: initializationError,
    missing: configStatus.missingRequired,
    missingOptional: configStatus.missingOptional,
    syncEnabled: configStatus.syncEnabled,
    message: configStatus.message,
    usingDevelopmentFallback: configStatus.usingDevelopmentFallback,
    projectId: configStatus.projectId,
    authDomain: configStatus.authDomain,
    storageBucket: configStatus.storageBucket,
    currentUser: client?.auth.currentUser?.email ?? client?.auth.currentUser?.uid ?? "Not signed in",
  };
}

export default getFirebaseClient;
