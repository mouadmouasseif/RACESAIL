export function normalizeSailNumber(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function sailNumberMatches(input: string, target: string): boolean {
  const a = normalizeSailNumber(input);
  const b = normalizeSailNumber(target);

  if (!a || !b) return false;
  if (a === b) return true;

  return b.endsWith(a) || a.endsWith(b);
}
