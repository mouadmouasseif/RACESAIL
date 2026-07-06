import { PageShell } from "@/components/page-shell";
import { CompetitionForm } from "@/components/competition-form";

export default function NewCompetitionPage() {
  return (
    <PageShell title="Create Competition" description="Set up the event details, race count, class, and logos for official exports.">
      <CompetitionForm />
    </PageShell>
  );
}
