"use client";

import { clearFirebaseSyncQueue as clearIndexedDbQueue, OLD_SYNC_QUEUE_KEY } from "@/lib/indexedDbQueue";

const OVERSIZED_QUEUE_LIMIT = 500 * 1024;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStorageKeySize(key: string) {
  if (!isBrowser()) return 0;
  try {
    return window.localStorage.getItem(key)?.length ?? 0;
  } catch (error) {
    console.warn("Unable to read storage key size", error);
    return 0;
  }
}

export function clearOversizedSyncQueue() {
  if (!isBrowser()) return false;

  try {
    const size = getStorageKeySize(OLD_SYNC_QUEUE_KEY);
    if (size <= OVERSIZED_QUEUE_LIMIT) return false;
    window.localStorage.removeItem(OLD_SYNC_QUEUE_KEY);
    window.dispatchEvent(new CustomEvent("raceSail:firebase-error", {
      detail: "Old Firebase sync queue cleared because it was too large.",
    }));
    window.dispatchEvent(new Event("raceSail:sync-queue"));
    return true;
  } catch (error) {
    console.warn("Unable to clear oversized sync queue", error);
    return false;
  }
}

export async function clearFirebaseSyncQueue() {
  await clearIndexedDbQueue();
}
