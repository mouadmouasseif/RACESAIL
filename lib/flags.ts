const countryMap: Record<string, string> = {
  morocco: "MA",
  maroc: "MA",
  ma: "MA",
  france: "FR",
  fr: "FR",
  italy: "IT",
  italie: "IT",
  it: "IT",
  uae: "AE",
  emirates: "AE",
  "united arab emirates": "AE",
  "emirats arabes unis": "AE",
  "émirats arabes unis": "AE",
  ae: "AE",
  spain: "ES",
  espagne: "ES",
  es: "ES",
  portugal: "PT",
  pt: "PT",
  germany: "DE",
  allemagne: "DE",
  de: "DE",
  netherlands: "NL",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  usa: "US",
  "united states": "US",
  us: "US",
};

export function getCountryCode(country: string): string {
  const normalized = country.trim().toLowerCase();
  const mapped = countryMap[normalized] || country.toUpperCase();
  return mapped.length === 2 ? mapped : "UN";
}

export function getFlagEmoji(country: string): string {
  const code = getCountryCode(country);
  if (code.length !== 2 || code === "UN") return "🏳️";

  return code
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getFlagForNationality(nationality: string) {
  return getFlagEmoji(nationality);
}

export function normalizeFlagCode(flag: string | undefined, nationality: string) {
  if (flag && /^[A-Z]{2}$/.test(flag)) return getFlagEmoji(flag);
  return getFlagEmoji(nationality);
}

export function getAthleteCategory(age: number): string {
  if (age < 12) return "B";
  return "Open";
}
