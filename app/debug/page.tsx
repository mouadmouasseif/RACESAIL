"use client";

import { useState } from "react";
import { AlertTriangle, Database, RotateCcw } from "lucide-react";
import { competitionStore } from "@/services/localStorageService";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
  const [message, setMessage] = useState("");

  function resetLocalData() {
    if (!window.confirm("Reset all local raceSail data on this device?")) return;
    competitionStore.clear();
    setMessage("Local data reset. Return to the dashboard to seed fresh demo data.");
  }

  function seedDemoData() {
    competitionStore.resetDemo();
    setMessage("Demo data restored.");
  }

  return (
    <PageShell title="Debug" description="Local device tools for raceSail data recovery.">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Local data</CardTitle>
          <CardDescription>Use these tools only when a device has broken or stale local storage.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="destructive" onClick={resetLocalData}><Database className="h-4 w-4" /> Reset local data</Button>
          <Button variant="outline" onClick={seedDemoData}><RotateCcw className="h-4 w-4" /> Restore demo data</Button>
          {message ? <p className="w-full text-sm font-medium text-sky-800">{message}</p> : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
