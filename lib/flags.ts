const countryCodeMap: Record<string, string> = {
  morocco: "MA",
  maroc: "MA",
  uae: "AE",
  "united arab emirates": "AE",
  france: "FR",
  italy: "IT",
  spain: "ES",
  portugal: "PT",
  germany: "DE",
  netherlands: "NL",
  "united kingdom": "GB",
  uk: "GB",
  usa: "US",
  "united states": "US",
};

export function getFlagForNationality(nationality: string) {
  return countryCodeMap[nationality.trim().toLowerCase()] ?? "UN";
}

export function normalizeFlagCode(flag: string | undefined, nationality: string) {
  if (flag && /^[A-Z]{2}$/.test(flag)) return flag;
  return getFlagForNationality(nationality);
}

export function getFlagEmoji(countryCode: string | undefined) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode) || countryCode === "UN") return "◌";
  const base = 127397;
  return String.fromCodePoint(...countryCode.split("").map((letter) => base + letter.charCodeAt(0)));
}
