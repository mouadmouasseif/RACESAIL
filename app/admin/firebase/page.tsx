"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseClient, getFirebaseStatus } from "@/lib/firebase";
import { getPendingChanges, syncPendingChanges } from "@/lib/firebaseSync";
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

  const refresh = useCallback((firestoreStatus = "Not tested") => {
    setState({
      ...getFirebaseStatus(),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      pending: getPendingChanges().length,
      firestoreStatus,
    });
  }, []);

  useEffect(() => {
    refresh();
    const onRefresh = () => refresh();
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
        refresh("Firebase is not initialized");
        return;
      }

      const ref = doc(client.db, "debug", "connection");
      await setDoc(ref, { checkedAt: new Date().toISOString(), app: "raceSail" }, { merge: true });
      const snapshot = await getDoc(ref);
      refresh(snapshot.exists() ? "Connected" : "Write failed");
    } catch (error) {
      console.error("Firestore connection test failed", error);
      refresh("Unable to synchronize with Firebase.");
    } finally {
      setTesting(false);
    }
  }

  async function syncQueue() {
    const result = await syncPendingChanges();
    refresh(result.pending === 0 ? "Pending queue synchronized" : "Some changes are still pending");
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
                Missing Firebase environment variables: {state.missing.join(", ")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={testFirestore} disabled={testing}>{testing ? "Testing..." : "Test Firestore connection"}</Button>
            <Button variant="secondary" onClick={syncQueue}>Sync pending changes</Button>
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
