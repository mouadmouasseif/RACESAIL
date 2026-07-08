"use client";

import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const fallbackFirebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyD5FfvUUMBybVKSv29PL27Wnj6vKkSy0iw",
  authDomain: "race-sail.firebaseapp.com",
  projectId: "race-sail",
  storageBucket: "race-sail.firebasestorage.app",
  messagingSenderId: "625970678316",
  appId: "1:625970678316:web:f4c68325768a77e19a9f89",
  measurementId: "G-Y140YJG9JT",
};

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackFirebaseConfig.measurementId,
};

type FirebaseClient = {
  app: FirebaseApp;
  db: Firestore;
  storage: FirebaseStorage;
};

let dbInstance: Firestore | undefined;

function configBooleans() {
  return {
    apiKey: Boolean(firebaseConfig.apiKey),
    authDomain: Boolean(firebaseConfig.authDomain),
    projectId: Boolean(firebaseConfig.projectId),
    appId: Boolean(firebaseConfig.appId),
  };
}

export function getFirebaseConfigStatus() {
  const status = configBooleans();
  const missing = Object.entries(status)
    .filter(([, ready]) => !ready)
    .map(([key]) => key);

  return {
    valid: missing.length === 0,
    syncEnabled: missing.length === 0,
    missingRequired: missing,
    missing: missing,
    missingOptional: [],
    message: missing.length > 0 ? `Firebase configuration is incomplete: ${missing.join(", ")}` : "",
    usingDevelopmentFallback: !(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    ),
    projectId: firebaseConfig.projectId ?? "",
    authDomain: firebaseConfig.authDomain ?? "",
    storageBucket: firebaseConfig.storageBucket ?? "",
    firebaseReady: missing.length === 0,
  };
}

export function notifyFirebaseError(message = "Unable to synchronize with Firebase.") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("raceSail:firebase-error", { detail: message }));
}

function createFirestore(appInstance: FirebaseApp) {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = initializeFirestore(appInstance, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    } as Parameters<typeof initializeFirestore>[1] & { useFetchStreams?: boolean });
  } catch (error) {
    console.warn("Firestore already initialized or long-polling options unavailable. Falling back to getFirestore().", error);
    dbInstance = getFirestore(appInstance);
  }

  return dbInstance;
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = createFirestore(app);
export const storage = getStorage(app);

export function getFirebaseClient(): FirebaseClient {
  return { app, db, storage };
}

export function getFirebaseStatus() {
  const configStatus = getFirebaseConfigStatus();
  return {
    initialized: true,
    error: configStatus.message || null,
    missing: configStatus.missing,
    missingOptional: configStatus.missingOptional,
    syncEnabled: configStatus.syncEnabled,
    message: configStatus.message,
    usingDevelopmentFallback: configStatus.usingDevelopmentFallback,
    projectId: configStatus.projectId,
    authDomain: configStatus.authDomain,
    storageBucket: configStatus.storageBucket,
    currentUser: "Not signed in",
  };
}

export async function initAnalytics() {
  if (typeof window === "undefined") return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return null;
    return getAnalytics(app);
  } catch (error) {
    console.warn("Firebase Analytics is not available.", error);
    return null;
  }
}

if (typeof window !== "undefined") {
  const status = getFirebaseConfigStatus();
  console.table({
    ...configBooleans(),
    firebaseReady: status.firebaseReady,
  });
}
