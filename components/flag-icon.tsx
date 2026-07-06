import { getCountryCode, getFlagEmoji } from "@/lib/flags";

export function FlagIcon({ flag, nationality }: { flag?: string; nationality?: string }) {
  const emoji = flag && !/^[A-Z]{2}$/.test(flag) ? flag : getFlagEmoji(flag || nationality || "");
  const code = getCountryCode(nationality || flag || "");

  return (
    <span className="inline-flex min-w-10 items-center gap-2">
      <span className="text-xl leading-none" aria-label={nationality ? `${nationality} flag` : "flag"}>
        {emoji}
      </span>
      <span className="text-xs font-semibold text-slate-500">{code !== "UN" ? code : ""}</span>
    </span>
  );
}
