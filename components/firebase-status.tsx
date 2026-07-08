"use client";

import { useEffect, useState } from "react";
import { getPendingChanges, syncPendingChanges } from "@/lib/firebaseSync";
import { migrateOldLocalStorageQueue } from "@/lib/indexedDbQueue";
import { clearOversizedSyncQueue } from "@/lib/cleanupStorage";

export function FirebaseStatusBadge() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function refreshQueue() {
      const pending = await getPendingChanges();
      if (active) setPendingCount(pending.length);
    }

    async function handleOnline() {
      setOnline(true);
      try {
        const result = await syncPendingChanges();
        if (!active) return;
        setPendingCount(result.pending);
        if (result.synced > 0) setMessage("Firebase synchronized.");
      } catch (error) {
        console.warn("Unable to synchronize with Firebase.", error);
        if (active) setMessage("Unable to synchronize with Firebase");
      }
    }

    function handleOffline() {
      setOnline(false);
      setMessage("Offline mode: changes will stay local until reconnect.");
    }

    function handleFirebaseError(event: Event) {
      const detail = event instanceof CustomEvent ? String(event.detail ?? "") : "";
      setMessage(detail || "Unable to synchronize with Firebase.");
      void refreshQueue();
    }

    const handleQueueChange = () => void refreshQueue();

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    setOnline(isOnline);
    clearOversizedSyncQueue();
    void migrateOldLocalStorageQueue();
    void refreshQueue();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("raceSail:sync-queue", handleQueueChange);
    window.addEventListener("raceSail:firebase-error", handleFirebaseError);

    if (isOnline) void handleOnline();

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("raceSail:sync-queue", handleQueueChange);
      window.removeEventListener("raceSail:firebase-error", handleFirebaseError);
    };
  }, []);

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        {online ? "Online" : "Offline"}
        {pendingCount > 0 ? ` - ${pendingCount} pending` : ""}
      </span>
      {message ? (
        <button
          type="button"
          onClick={() => setMessage("")}
          className="max-w-[220px] truncate text-right text-xs font-medium text-slate-500 hover:text-slate-800"
          title={message}
        >
          {message}
        </button>
      ) : null}
    </div>
  );
}
