"use client";

import { useEffect, useMemo, useState } from "react";
import type { Athlete, Competition } from "@/types";
import { formatRaceCell, getDiscardedRaceNumbers, getFinishedRaceCount, raceNumbers, rankedAthletes } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Eye, FileText, History, Pencil, Search, Trash2 } from "lucide-react";
import { FlagIcon } from "@/components/flag-icon";
import { LogoImage } from "@/components/logo-image";

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
  onDuplicateAthlete,
  searchable = false,
}: {
  competition: Competition;
  athletes?: Athlete[];
  onDeleteAthlete?: (athleteId: string) => void;
  onEditAthlete?: (athlete: Athlete) => void;
  onDuplicateAthlete?: (athlete: Athlete) => void;
  searchable?: boolean;
}) {
  const raceColumns = raceNumbers(competition.raceCount);
  const finishedRaceCount = getFinishedRaceCount(competition.races);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ country: "all", club: "all", boatClass: "all", sex: "all", category: "all" });
  const [sortKey, setSortKey] = useState("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.getElementById("athlete-search")?.focus();
      }
      if (event.key === "Escape") setSearchText("");
    }

    if (searchable) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchable]);

  const filterOptions = useMemo(() => ({
    countries: unique(athletes.map((athlete) => athlete.nationality)),
    clubs: unique(athletes.map((athlete) => athlete.clubName)),
    boatClasses: unique(athletes.map((athlete) => athlete.boatClass)),
    categories: unique(athletes.map((athlete) => athlete.category)),
  }), [athletes]);

  const rows = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = rankedAthletes(athletes, competition.raceCount, finishedRaceCount).filter((athlete) => {
      const fullName = `${athlete.firstName} ${athlete.lastName}`;
      const searchableText = [
        athlete.firstName,
        athlete.lastName,
        fullName,
        athlete.sailNumber,
        athlete.clubName,
        athlete.nationality,
        athlete.boatClass,
        athlete.licenseNumber,
        athlete.sex,
        athlete.category,
      ].join(" ").toLowerCase();

      return (!query || searchableText.includes(query))
        && (filters.country === "all" || athlete.nationality === filters.country)
        && (filters.club === "all" || athlete.clubName === filters.club)
        && (filters.boatClass === "all" || athlete.boatClass === filters.boatClass)
        && (filters.sex === "all" || athlete.sex === filters.sex)
        && (filters.category === "all" || athlete.category === filters.category);
    });

    filtered.sort((a, b) => compareAthletes(a, b, sortKey) * (sortDirection === "asc" ? 1 : -1));
    return filtered;
  }, [athletes, competition.raceCount, debouncedSearch, filters, sortDirection, sortKey, finishedRaceCount]);

  const visibleRows = rows.length > 300 ? rows.slice(0, 300) : rows;

  return (
    <div className="grid gap-3">
      {searchable ? (
        <div className="sticky top-16 z-20 grid gap-3 rounded-lg border bg-white/95 p-3 shadow-sm backdrop-blur md:grid-cols-[1.4fr_repeat(6,minmax(120px,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              id="athlete-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && rows[0]) document.getElementById(`athlete-row-${rows[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              placeholder="Search athlete..."
              className="h-10 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <FilterSelect label="Country" value={filters.country} options={filterOptions.countries} onChange={(value) => setFilters((current) => ({ ...current, country: value }))} />
          <FilterSelect label="Club" value={filters.club} options={filterOptions.clubs} onChange={(value) => setFilters((current) => ({ ...current, club: value }))} />
          <FilterSelect label="Boat" value={filters.boatClass} options={filterOptions.boatClasses} onChange={(value) => setFilters((current) => ({ ...current, boatClass: value }))} />
          <FilterSelect label="Sex" value={filters.sex} options={["M", "F"]} onChange={(value) => setFilters((current) => ({ ...current, sex: value }))} />
          <FilterSelect label="Category" value={filters.category} options={filterOptions.categories} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} />
          <div className="grid grid-cols-2 gap-2">
            <FilterSelect label="Sort" value={sortKey} options={["rank", "sail", "name", "nationality", "club", "total", "net", "category"]} onChange={setSortKey} />
            <FilterSelect label="Dir" value={sortDirection} options={["asc", "desc"]} onChange={(value) => setSortDirection(value as "asc" | "desc")} />
          </div>
        </div>
      ) : null}
      {rows.length > visibleRows.length ? <p className="text-sm text-muted-foreground">Showing first 300 of {rows.length} athletes for performance.</p> : null}
      <div className="overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Rank</TableHead>
            <TableHead>Sail</TableHead>
            <TableHead>Flag</TableHead>
            <TableHead>Athlete</TableHead>
            <TableHead>Sex</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>Club Logo</TableHead>
            <TableHead>Club</TableHead>
            {raceColumns.map((raceNumber) => <TableHead key={raceNumber}>Race {raceNumber}</TableHead>)}
            <TableHead>Total</TableHead>
            <TableHead>Discard</TableHead>
            <TableHead>Net</TableHead>
            <TableHead>Final Rank</TableHead>
            {onDeleteAthlete || onEditAthlete ? <TableHead>Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((athlete) => {
            const discardedRaceNumbers = getDiscardedRaceNumbers(athlete, competition.raceCount);
            return (
              <TableRow id={`athlete-row-${athlete.id}`} key={athlete.id} className={athlete.rank <= 3 ? "bg-cyan-50/60" : undefined}>
                <TableCell>{rankBadge(athlete.rank)}</TableCell>
                <TableCell className="font-mono font-semibold">{highlight(athlete.sailNumber, debouncedSearch)}</TableCell>
                <TableCell><FlagIcon flag={athlete.flag} nationality={athlete.nationality} /></TableCell>
                <TableCell className="font-semibold">{highlight(`${athlete.firstName} ${athlete.lastName}`, debouncedSearch)}</TableCell>
                <TableCell>{athlete.sex}</TableCell>
                <TableCell>{athlete.category}</TableCell>
                <TableCell>{highlight(athlete.nationality, debouncedSearch)}</TableCell>
                <TableCell><LogoImage src={athlete.clubLogo} alt={`${athlete.clubName} logo`} className="h-8 w-8" /></TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <LogoImage src={athlete.clubLogo} alt={`${athlete.clubName} logo`} className="h-7 w-7" />
                    <span>{highlight(athlete.clubName, debouncedSearch)}</span>
                  </span>
                </TableCell>
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
                      <Button variant="ghost" size="icon" onClick={() => alert(`${athlete.firstName} ${athlete.lastName}\nSail: ${athlete.sailNumber}\nClub: ${athlete.clubName}`)} aria-label="View profile">
                        <Eye className="h-4 w-4 text-slate-700" />
                      </Button>
                      {onDuplicateAthlete ? (
                        <Button variant="ghost" size="icon" onClick={() => onDuplicateAthlete(athlete)} aria-label="Duplicate athlete">
                          <Copy className="h-4 w-4 text-slate-700" />
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => alert(Object.values(athlete.results).map((result) => `R${result.raceNumber}: ${result.penalty === "OK" ? result.points : `${result.points} ${result.penalty}`}`).join("\n") || "No race history")} aria-label="Show race history">
                        <History className="h-4 w-4 text-slate-700" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label="Export athlete PDF">
                        <FileText className="h-4 w-4 text-slate-700" />
                      </Button>
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
    </div>
  );
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function compareAthletes(a: Athlete, b: Athlete, key: string) {
  const values: Record<string, [string | number, string | number]> = {
    rank: [a.rank, b.rank],
    sail: [a.sailNumber, b.sailNumber],
    name: [`${a.firstName} ${a.lastName}`, `${b.firstName} ${b.lastName}`],
    nationality: [a.nationality, b.nationality],
    club: [a.clubName, b.clubName],
    total: [a.total, b.total],
    net: [a.net, b.net],
    category: [a.category, b.category],
  };
  const [left, right] = values[key] ?? values.rank;
  return typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-sky-200 px-0.5">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border bg-white px-2 text-sm text-slate-900">
        <option value="all">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
