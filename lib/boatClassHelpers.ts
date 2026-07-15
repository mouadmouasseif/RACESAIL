import type { Athlete, BoatClass, BoatClassId, Competition, CompetitionBoatClass } from "@/types";

function slugifyClass(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function boatClassIdFromName(name: string) {
  return slugifyClass(name) || "class";
}

export function getAthleteBoatClassId(athlete: Pick<Athlete, "boatClass" | "boatClassId">) {
  return athlete.boatClassId || boatClassIdFromName(athlete.boatClass);
}

export function getCompetitionBoatClasses(competition: Competition): CompetitionBoatClass[] {
  const existing = (competition.boatClasses ?? []).filter((item) => item.enabled !== false);
  const byId = new Map<string, CompetitionBoatClass>();

  existing.forEach((item, index) => {
    byId.set(item.id, { ...item, startOrder: item.startOrder ?? index + 1, enabled: item.enabled !== false });
  });

  if (!byId.size) {
    byId.set(boatClassIdFromName(competition.boatClass), {
      id: boatClassIdFromName(competition.boatClass),
      name: competition.boatClass,
      shortName: competition.boatClass,
      startOrder: 1,
      enabled: true,
    });
  }

  competition.athletes.forEach((athlete) => {
    const id = getAthleteBoatClassId(athlete);
    if (byId.has(id)) return;
    byId.set(id, {
      id,
      name: athlete.boatClass,
      shortName: athlete.boatClass,
      startOrder: byId.size + 1,
      enabled: true,
    });
  });

  return Array.from(byId.values()).sort((a, b) => (a.startOrder ?? 999) - (b.startOrder ?? 999) || a.name.localeCompare(b.name));
}

export function filterAthletesByBoatClass(athletes: Athlete[], boatClassId: BoatClassId) {
  return athletes.filter((athlete) => getAthleteBoatClassId(athlete) === boatClassId);
}

export function toBoatClassName(name: string): BoatClass {
  const allowed = ["Optimist", "ILCA 4", "ILCA 6", "ILCA 7", "Catamaran", "Windsurf", "Other"] as const;
  return allowed.includes(name as BoatClass) ? (name as BoatClass) : "Other";
}
