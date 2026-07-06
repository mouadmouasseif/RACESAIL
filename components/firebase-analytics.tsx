"use client";

import { useEffect } from "react";

import { initializeFirebaseAnalytics } from "@/services/firebaseService";

export function FirebaseAnalytics() {
  useEffect(() => {
    void initializeFirebaseAnalytics();
  }, []);

  return null;
}
