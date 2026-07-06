import { getFlagEmoji } from "@/lib/flags";

export function FlagIcon({ code, nationality }: { code?: string; nationality?: string }) {
  return (
    <span className="inline-flex min-w-10 items-center gap-2">
      <span className="text-xl leading-none" aria-label={nationality ? `${nationality} flag` : "flag"}>
        {getFlagEmoji(code)}
      </span>
      <span className="text-xs font-semibold text-slate-500">{code && code !== "UN" ? code : ""}</span>
    </span>
  );
}
