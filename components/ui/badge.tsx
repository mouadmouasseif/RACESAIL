import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "success" | "gold" | "silver" | "bronze";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    success: "bg-emerald-100 text-emerald-800",
    gold: "bg-amber-100 text-amber-900",
    silver: "bg-slate-200 text-slate-800",
    bronze: "bg-orange-100 text-orange-900",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant], className)}
      {...props}
    />
  );
}
