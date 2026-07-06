const alpha2Map: Record<string, string> = {
  morocco: "MA",
  maroc: "MA",
  ma: "MA",
  mar: "MA",

  france: "FR",
  fr: "FR",
  fra: "FR",

  italy: "IT",
  italie: "IT",
  it: "IT",
  ita: "IT",

  uae: "AE",
  emirates: "AE",
  "united arab emirates": "AE",
  "emirats arabes unis": "AE",
  ae: "AE",

  spain: "ES",
  espagne: "ES",
  es: "ES",
  esp: "ES",

  portugal: "PT",
  pt: "PT",
  prt: "PT",

  germany: "DE",
  allemagne: "DE",
  de: "DE",
  deu: "DE",

  netherlands: "NL",
  nl: "NL",
  nld: "NL",

  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  gbr: "GB",

  usa: "US",
  "united states": "US",
  us: "US",
};

const alpha3Map: Record<string, string> = {
  morocco: "MAR",
  maroc: "MAR",
  ma: "MAR",
  mar: "MAR",

  france: "FRA",
  fr: "FRA",
  fra: "FRA",

  italy: "ITA",
  italie: "ITA",
  it: "ITA",
  ita: "ITA",

  uae: "UAE",
  emirates: "UAE",
  "united arab emirates": "UAE",
  "emirats arabes unis": "UAE",
  ae: "UAE",

  spain: "ESP",
  espagne: "ESP",
  es: "ESP",
  esp: "ESP",

  portugal: "POR",
  pt: "POR",
  prt: "POR",

  germany: "GER",
  allemagne: "GER",
  de: "GER",
  deu: "GER",

  netherlands: "NED",
  nl: "NED",
  nld: "NED",

  "united kingdom": "GBR",
  uk: "GBR",
  gb: "GBR",
  gbr: "GBR",

  usa: "USA",
  "united states": "USA",
  us: "USA",
};

function normalizeCountry(country: string) {
  return country.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getCountryCode(country: string): string {
  const value = normalizeCountry(country);
  if (!value) return "";
  return alpha3Map[value] || country.trim().toUpperCase().slice(0, 3);
}

export function getFlagEmoji(country: string): string {
  const value = normalizeCountry(country);
  const code = alpha2Map[value];
  if (!code) return "🏳️";

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
