import type { Athlete, Competition } from "@/types";
import { formatRaceCell, getDiscardedRaceNumbers, raceNumbers, rankedAthletes } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { FlagIcon } from "@/components/flag-icon";

function rankBadge(rank: number) {
  if (rank === 1) return <Badge variant="gold">1</Badge>;
  if (rank === 2) return <Badge variant="silver">2</Badge>;
  if (rank === 3) return <Badge variant="bronze">3</Badge>;
  return <Badge variant="secondary">{rank}</Badge>;
}

export function ResultsTable({
  competition,
  athletes = competition.athletes,
  onDeleteAthlete,
  onEditAthlete,
}: {
  competition: Competition;
  athletes?: Athlete[];
  onDeleteAthlete?: (athleteId: string) => void;
  onEditAthlete?: (athlete: Athlete) => void;
}) {
  const raceColumns = raceNumbers(competition.raceCount);
  const rows = rankedAthletes(athletes, competition.raceCount);

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Rank</TableHead>
            <TableHead>Sail Number</TableHead>
            <TableHead>Flag</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Club</TableHead>
            <TableHead>Boat Class</TableHead>
            {raceColumns.map((raceNumber) => <TableHead key={raceNumber}>Race {raceNumber}</TableHead>)}
            <TableHead>Total</TableHead>
            <TableHead>Discard</TableHead>
            <TableHead>Net</TableHead>
            <TableHead>Final Rank</TableHead>
            {onDeleteAthlete || onEditAthlete ? <TableHead>Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((athlete) => {
            const discardedRaceNumbers = getDiscardedRaceNumbers(athlete, competition.raceCount);
            return (
              <TableRow key={athlete.id} className={athlete.rank <= 3 ? "bg-cyan-50/60" : undefined}>
                <TableCell>{rankBadge(athlete.rank)}</TableCell>
                <TableCell className="font-mono font-semibold">{athlete.sailNumber}</TableCell>
                <TableCell><FlagIcon code={athlete.flag} nationality={athlete.nationality} /></TableCell>
                <TableCell>{athlete.nationality}</TableCell>
                <TableCell>{athlete.firstName}</TableCell>
                <TableCell className="font-semibold">{athlete.lastName}</TableCell>
                <TableCell>{athlete.clubName}</TableCell>
                <TableCell>{athlete.boatClass}</TableCell>
                {raceColumns.map((raceNumber) => (
                  <TableCell key={raceNumber} className={discardedRaceNumbers.has(raceNumber) ? "font-semibold text-slate-500" : undefined}>
                    {formatRaceCell(athlete.results[raceNumber], discardedRaceNumbers.has(raceNumber))}
                  </TableCell>
                ))}
                <TableCell className="font-bold">{athlete.total}</TableCell>
                <TableCell>{athlete.discard ? athlete.discard : "-"}</TableCell>
                <TableCell className="font-bold text-sky-800">{athlete.net}</TableCell>
                <TableCell>{athlete.rank}</TableCell>
                {onDeleteAthlete || onEditAthlete ? (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onEditAthlete ? (
                        <Button variant="ghost" size="icon" onClick={() => onEditAthlete(athlete)} aria-label={`Edit ${athlete.firstName} ${athlete.lastName}`}>
                          <Pencil className="h-4 w-4 text-sky-700" />
                        </Button>
                      ) : null}
                      {onDeleteAthlete ? (
                        <Button variant="ghost" size="icon" onClick={() => onDeleteAthlete(athlete.id)} aria-label={`Delete ${athlete.firstName} ${athlete.lastName}`}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
