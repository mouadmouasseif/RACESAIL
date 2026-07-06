"use client";

import { useEffect } from "react";
import { ErrorBoundaryView } from "@/components/error-boundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("raceSail route error", error);
  }, [error]);

  return <ErrorBoundaryView error={error} reset={reset} />;
}
