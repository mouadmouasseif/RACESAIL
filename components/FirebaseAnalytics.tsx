"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebase";

export function FirebaseAnalytics() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  return null;
}
