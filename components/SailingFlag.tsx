"use client";

import { getSailingFlag } from "@/lib/sailingFlags";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SailingFlagProps = {
  code: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
};

const sizes = {
  sm: "h-8 w-10 text-xs",
  md: "h-12 w-16 text-sm",
  lg: "h-16 w-24 text-lg",
};

export function SailingFlag({ code, size = "md", showLabel = false }: SailingFlagProps) {
  const flag = getSailingFlag(code);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="inline-flex items-center gap-2">
      {flag.imageUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag.imageUrl} alt={flag.label} className={cn("rounded border object-cover shadow-sm", sizes[size])} onError={() => setImageFailed(true)} />
      ) : (
        <div className={cn("grid place-items-center rounded border font-black shadow-sm", sizes[size], flag.color)}>
          {flag.code}
        </div>
      )}
      {showLabel ? (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{flag.label}</p>
          <p className="text-xs text-muted-foreground">{flag.description}</p>
        </div>
      ) : null}
    </div>
  );
}
