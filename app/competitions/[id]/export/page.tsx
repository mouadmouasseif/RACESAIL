"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { Competition } from "@/types";
import { competitionStore } from "@/services/localStorageService";
import { getCompetitionFromFirestore } from "@/services/firebaseService";
import { downloadCsv, downloadExcel, downloadPdf } from "@/lib/export";
import { CompetitionNav } from "@/components/competition-nav";
import { PageShell } from "@/components/page-shell";
import { ResultsTable } from "@/components/results-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExportPage() {
  const params = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCompetition() {
      setLoading(true);
      try {
        const firebaseCompetition = await getCompetitionFromFirestore(params.id);
        if (active && firebaseCompetition) {
          setCompetition(firebaseCompetition);
          return;
        }
      } catch (error) {
        console.error("Firebase export load failed", error);
      } finally {
        if (active) {
          setCompetition((current) => current ?? competitionStore.get(params.id));
          setLoading(false);
        }
      }
    }

    void loadCompetition();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) return <PageShell title="Loading export data..." />;
  if (!competition) return <PageShell title="Competition not found" />;

  return (
    <PageShell title="Export Results" description="Download official result sheets for sharing and archiving.">
      <CompetitionNav id={competition.id} />
      <Card className="mb-6">
        <CardHeader><CardTitle>Downloads</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => downloadPdf(competition)}><FileText className="h-4 w-4" /> Download PDF</Button>
          <Button variant="secondary" onClick={() => downloadCsv(competition)}><Download className="h-4 w-4" /> Download CSV</Button>
          <Button variant="outline" onClick={() => downloadExcel(competition)}><FileSpreadsheet className="h-4 w-4" /> Download Excel</Button>
        </CardContent>
      </Card>
      <ResultsTable competition={competition} />
    </PageShell>
  );
}
