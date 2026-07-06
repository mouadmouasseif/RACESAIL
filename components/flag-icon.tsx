import { getCountryCode, getFlagEmoji } from "@/lib/flags";

export function FlagIcon({ flag, nationality }: { flag?: string; nationality?: string }) {
  const emoji = getFlagEmoji(nationality || flag || "");
  const code = getCountryCode(nationality || flag || "");

  return (
    <span className="inline-flex min-w-10 items-center gap-2">
      <span className="text-xl leading-none" aria-label={nationality ? `${nationality} flag` : "flag"}>
        {emoji}
      </span>
      <span className="text-xs font-semibold text-slate-500">{code}</span>
    </span>
  );
}
