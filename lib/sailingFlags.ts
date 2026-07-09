"use client";

export type SailingFlagDefinition = {
  code: string;
  label: string;
  description: string;
  color?: string;
  imageUrl?: string;
};

export const sailingFlags: SailingFlagDefinition[] = [
  { code: "AP", label: "Apercu", description: "Postponement signal", color: "bg-red-600 text-white", imageUrl: "/sailing-flags/ap.png" },
  { code: "P", label: "Preparatory", description: "P = Preparatory flag", color: "bg-blue-700 text-white", imageUrl: "/sailing-flags/p.png" },
  { code: "I", label: "I flag rule", description: "I flag rule", color: "bg-yellow-300 text-slate-950", imageUrl: "/sailing-flags/i.png" },
  { code: "Z", label: "Rule Z", description: "20% penalty rule", color: "bg-yellow-500 text-slate-950" },
  { code: "U", label: "U flag / UFD", description: "U flag rule / UFD", color: "bg-red-700 text-white", imageUrl: "/sailing-flags/u.png" },
  { code: "Black", label: "Black flag / BFD", description: "Black flag rule / BFD", color: "bg-slate-950 text-white", imageUrl: "/sailing-flags/black.png" },
  { code: "X", label: "Individual recall", description: "Individual recall", color: "bg-white text-blue-800 border border-blue-800", imageUrl: "/sailing-flags/x.png" },
  { code: "FirstSubstitute", label: "General recall", description: "General recall", color: "bg-yellow-200 text-blue-900", imageUrl: "/sailing-flags/first-substitute.png" },
  { code: "Orange", label: "Start line", description: "Starting line sighting mast", color: "bg-orange-500 text-white", imageUrl: "/sailing-flags/orange.png" },
  { code: "Blue", label: "Finish line", description: "Finish line", color: "bg-blue-600 text-white", imageUrl: "/sailing-flags/blue.png" },
  { code: "ClassFlag", label: "Class flag", description: "Class warning signal", color: "bg-cyan-100 text-cyan-950" },
  { code: "Optimist", label: "Optimist", description: "Optimist class flag", color: "bg-emerald-100 text-emerald-900", imageUrl: "/sailing-flags/class-optimist.png" },
  { code: "ILCA", label: "ILCA", description: "ILCA class flag", color: "bg-indigo-100 text-indigo-900", imageUrl: "/sailing-flags/class-ilca.png" },
];

export function getSailingFlag(code: string) {
  return sailingFlags.find((flag) => flag.code.toLowerCase() === code.toLowerCase()) ?? {
    code,
    label: code || "Flag",
    description: "Custom race signal",
    color: "bg-slate-100 text-slate-900",
  };
}

export function getClassFlagCode(boatClass?: string) {
  if (!boatClass) return "ClassFlag";
  if (boatClass.toLowerCase().includes("optimist")) return "Optimist";
  if (boatClass.toLowerCase().includes("ilca")) return "ILCA";
  return "ClassFlag";
}
