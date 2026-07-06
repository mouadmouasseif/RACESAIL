"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorBoundaryView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border bg-white p-6 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">raceSail could not load this view</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A device cache or local data issue may have interrupted the page. Try again, or use the Debug page to reset local data.
        </p>
        <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {error.message || "Unknown client error"}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}><RefreshCcw className="h-4 w-4" /> Try again</Button>
          <Button variant="outline" onClick={() => { window.location.href = "/debug"; }}>Open Debug</Button>
        </div>
      </section>
    </main>
  );
}
