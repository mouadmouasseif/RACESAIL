import { getCountryCode, getFlagImagePath } from "@/lib/flags";

export function FlagIcon({ flag, nationality }: { flag?: string; nationality?: string }) {
  const flagPath = getFlagImagePath(nationality || flag || "");
  const code = getCountryCode(nationality || flag || "");

  return (
    <span className="inline-flex min-w-10 items-center gap-2">
      <img src={flagPath} alt={nationality || "flag"} className="h-5 w-7 rounded object-cover" />
      <span className="text-xs font-semibold text-slate-500">{code}</span>
    </span>
  );
}
