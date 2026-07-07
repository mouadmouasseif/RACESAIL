"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudUpload, Plus } from "lucide-react";
import type { Competition } from "@/types";
import { getFirebaseConfigStatus } from "@/lib/firebase";
import { competitionStore } from "@/services/localStorageService";
import { syncCompetitionsToFirestore } from "@/services/firebaseService";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { CompetitionCard } from "@/components/competition-card";
import { StatCard } from "@/components/stat-card";
import InstallAppButton from "@/components/install-app-button";

export default function DashboardPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const firebaseStatus = getFirebaseConfigStatus();

  useEffect(() => {
    setCompetitions(competitionStore.list());
    const sync = () => setCompetitions(competitionStore.list());
    window.addEventListener("raceSail:storage", sync);
    return () => window.removeEventListener("raceSail:storage", sync);
  }, []);

  const athleteCount = competitions.reduce((sum, competition) => sum + competition.athletes.length, 0);
  const raceCount = competitions.reduce((sum, competition) => sum + competition.raceCount, 0);
  function removeCompetition(id: string) {
    if (!window.confirm("Delete this competition and all stored local results?")) return;
    competitionStore.delete(id);
    setCompetitions(competitionStore.list());
  }

  async function syncLocalData() {
    if (!firebaseStatus.syncEnabled) {
      setSyncMessage("Firebase is not configured. Add environment variables in Vercel and redeploy.");
      return;
    }

    setSyncing(true);
    setSyncMessage("");
    try {
      const localCompetitions = competitionStore.list();
      await syncCompetitionsToFirestore(localCompetitions);
      setSyncMessage("Data synced to Firebase successfully.");
    } catch (error) {
      console.error("Firebase sync failed", error);
      setSyncMessage("Firebase sync failed. Please check your connection and Firestore rules.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PageShell
      title="Sailing competitions dashboard"
      description="Create regattas, manage athletes, enter race results, and export professional score sheets."
      actions={
        <>
          <InstallAppButton />
          <Button onClick={syncLocalData} disabled={syncing || !firebaseStatus.syncEnabled} className="bg-white text-sky-900 hover:bg-sky-50">
            <CloudUpload className="h-4 w-4" />
            {syncing ? "Syncing..." : "Sync local data to Firebase"}
          </Button>
          <Button asChild className="bg-white text-sky-900 hover:bg-sky-50">
            <Link href="/competitions/new"><Plus className="h-4 w-4" /> Create Competition</Link>
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Competitions" value={competitions.length} />
        <StatCard label="Athletes" value={athleteCount} />
        <StatCard label="Configured races" value={raceCount} />
      </div>
      {syncMessage ? (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          {syncMessage}
        </div>
      ) : null}
      {!firebaseStatus.syncEnabled ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Firebase is not configured. Add environment variables in Vercel and redeploy.
        </div>
      ) : null}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-950">All competitions</h2>
        <Button asChild variant="ghost" size="sm"><Link href="/debug">Debug</Link></Button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {competitions.map((competition) => (
          <div key={competition.id} className="grid gap-2">
            <CompetitionCard competition={competition} />
            <Button variant="ghost" size="sm" className="justify-self-start text-red-700 hover:text-red-800" onClick={() => removeCompetition(competition.id)}>
              Delete competition
            </Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
