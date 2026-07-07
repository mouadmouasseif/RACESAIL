"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseClient, getFirebaseStatus } from "@/lib/firebase";
import { clearOversizedSyncQueue } from "@/lib/cleanupStorage";
import { clearFirebaseSyncQueue, getPendingChanges, syncPendingChanges } from "@/lib/firebaseSync";
import { competitionStore } from "@/services/localStorageService";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DebugState = ReturnType<typeof getFirebaseStatus> & {
  online: boolean;
  pending: number;
  firestoreStatus: string;
};

export default function FirebaseAdminPage() {
  const [state, setState] = useState<DebugState>(() => ({
    ...getFirebaseStatus(),
    online: true,
    pending: 0,
    firestoreStatus: "Not tested",
  }));
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async (firestoreStatus = "Not tested") => {
    const pending = await getPendingChanges();
    setState({
      ...getFirebaseStatus(),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      pending: pending.length,
      firestoreStatus,
    });
  }, []);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("online", onRefresh);
    window.addEventListener("offline", onRefresh);
    window.addEventListener("raceSail:sync-queue", onRefresh);
    return () => {
      window.removeEventListener("online", onRefresh);
      window.removeEventListener("offline", onRefresh);
      window.removeEventListener("raceSail:sync-queue", onRefresh);
    };
  }, [refresh]);

  async function testFirestore() {
    setTesting(true);
    try {
      const client = getFirebaseClient();
      if (!client) {
        void refresh("Firebase is not configured. Add environment variables in Vercel and redeploy.");
        return;
      }

      const ref = doc(client.db, "debug", "connection");
      await setDoc(ref, { checkedAt: new Date().toISOString(), app: "raceSail" }, { merge: true });
      const snapshot = await getDoc(ref);
      void refresh(snapshot.exists() ? "Connected" : "Write failed");
    } catch (error) {
      console.error("Firestore connection test failed", error);
      void refresh("Unable to synchronize with Firebase.");
    } finally {
      setTesting(false);
    }
  }

  async function syncQueue() {
    const result = await syncPendingChanges();
    void refresh(result.pending === 0 ? "Pending queue synchronized" : "Some changes are still pending");
  }

  async function clearQueue() {
    if (!window.confirm("Clear Firebase sync queue on this device? Competitions will not be deleted.")) return;
    await clearFirebaseSyncQueue();
    void refresh("Sync queue cleared");
  }

  function clearOversizedCache() {
    const cleared = clearOversizedSyncQueue();
    void refresh(cleared ? "Oversized cache cleared" : "No oversized cache found");
  }

  function resetLocalData() {
    if (!window.confirm("Reset all local raceSail data on this device?")) return;
    competitionStore.clear();
    void refresh("Local data reset");
  }

  return (
    <PageShell title="Firebase admin" description="Connection diagnostics for raceSail realtime sync.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Firebase status</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <StatusRow label="Firebase initialized" value={state.initialized ? "Yes" : "No"} />
            <StatusRow label="Project ID" value={state.projectId || "-"} />
            <StatusRow label="Auth Domain" value={state.authDomain || "-"} />
            <StatusRow label="Storage Bucket" value={state.storageBucket || "-"} />
            <StatusRow label="Firestore status" value={state.firestoreStatus} />
            <StatusRow label="Online status" value={state.online ? "Online" : "Offline"} />
            <StatusRow label="Pending queue" value={String(state.pending)} />
            <StatusRow label="Current user" value={state.currentUser} />
            {state.missing.length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                Firebase is not configured. Add environment variables in Vercel and redeploy.
              </div>
            ) : null}
            {state.usingDevelopmentFallback ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                Development fallback Firebase config is active. Production still requires Vercel environment variables.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={testFirestore} disabled={testing || !state.syncEnabled}>{testing ? "Testing..." : "Test Firestore connection"}</Button>
            <Button variant="secondary" onClick={syncQueue} disabled={!state.syncEnabled}>Sync pending changes</Button>
            <Button variant="outline" onClick={clearQueue}>Clear sync queue</Button>
            <Button variant="outline" onClick={clearOversizedCache}>Clear oversized cache</Button>
            <Button variant="destructive" onClick={resetLocalData}>Reset all local data</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Required Vercel Environment Variables</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm text-slate-700">
            <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>
            <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>
            <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>
            <code>NEXT_PUBLIC_FIREBASE_APP_ID</code>
            <p className="font-medium text-sky-800">After adding env vars: Redeploy the project.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-white px-3 py-2">
      <span className="font-medium text-slate-600">{label}</span>
      <Badge variant="secondary">{value}</Badge>
    </div>
  );
}
