import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-sky-800", className)}>
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={cn("h-12 w-12 rounded-md object-cover", className)} />;
}
