"use client";

import { useEffect } from "react";
import { ErrorBoundaryView } from "@/components/error-boundary";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("raceSail global error", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorBoundaryView error={error} reset={reset} />
      </body>
    </html>
  );
}
