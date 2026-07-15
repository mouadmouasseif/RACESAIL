import Link from "next/link";
import { BookOpen, Download, LayoutDashboard, Radio, Trophy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompetitionNav({ id }: { id: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Button asChild variant="outline"><Link href={`/competitions/${id}`}><LayoutDashboard className="h-4 w-4" /> Overview</Link></Button>
      <Button asChild variant="outline"><Link href={`/competitions/${id}/athletes`}><UserPlus className="h-4 w-4" /> Athletes</Link></Button>
      <Button asChild variant="outline"><Link href={`/competitions/${id}/results`}><Trophy className="h-4 w-4" /> Results</Link></Button>
      <Button asChild variant="outline"><Link href={`/competitions/${id}/live`}><Radio className="h-4 w-4" /> Live</Link></Button>
      <Button asChild variant="outline"><Link href={`/competitions/${id}/export`}><Download className="h-4 w-4" /> Export</Link></Button>
      <Button asChild variant="outline"><Link href="/guide"><BookOpen className="h-4 w-4" /> Guide</Link></Button>
    </div>
  );
}
