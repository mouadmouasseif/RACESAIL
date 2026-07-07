"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const OLD_SYNC_QUEUE_KEY = "raceSail.firebaseSyncQueue";
const DB_NAME = "raceSailFirebaseQueue";
const STORE_NAME = "pendingWrites";
const DB_VERSION = 1;
const MAX_QUEUE_ITEMS = 500;
const OLD_QUEUE_BYTE_LIMIT = 150_000;

export type QueuePayload = Record<string, unknown>;

export type QueuedWrite = {
  id: string;
  type: string;
  path: string;
  documentId: string;
  payload: QueuePayload;
  createdAt: string;
};

interface RaceSailQueueDb extends DBSchema {
  pendingWrites: {
    key: string;
    value: QueuedWrite;
    indexes: {
      "by-createdAt": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<RaceSailQueueDb>> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function createQueueId(type: string) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function dispatchQueueChange() {
  if (isBrowser()) window.dispatchEvent(new Event("raceSail:sync-queue"));
}

export function sanitizeQueuePayload<T>(value: T): T {
  if (typeof value === "string") {
    if (value.startsWith("data:image") || value.startsWith("blob:")) return "" as T;
    return value as T;
  }

  if (Array.isArray(value)) return value.map((item) => sanitizeQueuePayload(item)) as T;

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => {
          const lower = key.toLowerCase();
          return item !== undefined && !lower.includes("logo") && !lower.includes("image") && !lower.includes("pdf");
        })
        .map(([key, item]) => [key, sanitizeQueuePayload(item)]),
    ) as T;
  }

  return value;
}

async function getDb() {
  if (!isBrowser()) return null;
  dbPromise ??= openDB<RaceSailQueueDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("by-createdAt", "createdAt");
    },
  });
  return dbPromise;
}

async function trimQueue(db: IDBPDatabase<RaceSailQueueDb>) {
  const items = await db.getAllFromIndex(STORE_NAME, "by-createdAt");
  const overflow = items.length - MAX_QUEUE_ITEMS;
  if (overflow <= 0) return;

  await Promise.all(items.slice(0, overflow).map((item) => db.delete(STORE_NAME, item.id)));
}

export async function addQueuedWrite(input: Omit<QueuedWrite, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return;

  const item: QueuedWrite = {
    ...input,
    id: createQueueId(input.type),
    payload: sanitizeQueuePayload(input.payload),
    createdAt: new Date().toISOString(),
  };

  await db.put(STORE_NAME, item);
  await trimQueue(db);
  dispatchQueueChange();
}

export async function getQueuedWrites() {
  const db = await getDb();
  if (!db) return [];
  return db.getAllFromIndex(STORE_NAME, "by-createdAt");
}

export async function removeQueuedWrite(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(STORE_NAME, id);
  dispatchQueueChange();
}

export async function clearFirebaseSyncQueue() {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(OLD_SYNC_QUEUE_KEY);
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("raceSail.temp") || key.startsWith("raceSail.cache") || key.includes("firebaseSyncQueue"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn("Unable to clear old sync queue cache", error);
  }

  const db = await getDb();
  if (db) await db.clear(STORE_NAME);
  dispatchQueueChange();
}

export async function migrateOldLocalStorageQueue() {
  if (!isBrowser()) return false;

  try {
    const raw = window.localStorage.getItem(OLD_SYNC_QUEUE_KEY);
    if (!raw) return false;

    if (raw.length > OLD_QUEUE_BYTE_LIMIT) {
      window.localStorage.removeItem(OLD_SYNC_QUEUE_KEY);
      window.dispatchEvent(new CustomEvent("raceSail:firebase-error", {
        detail: "Old sync queue cleared because it was too large.",
      }));
      dispatchQueueChange();
      return true;
    }

    window.localStorage.removeItem(OLD_SYNC_QUEUE_KEY);
    dispatchQueueChange();
    return false;
  } catch (error) {
    console.warn("Unable to migrate old sync queue", error);
    return false;
  }
}
