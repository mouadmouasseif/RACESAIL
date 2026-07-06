"use client";

import { Bell, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission } from "@/services/notificationService";

export function LiveActions({ competitionId }: { competitionId: string }) {
  async function copyLiveLink() {
    const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://racesail.vercel.app");
    const link = `${origin}/competitions/${competitionId}/live`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        alert("Live results link copied.");
        return;
      }
    } catch {
      // Fall through to prompt fallback.
    }

    if (typeof window !== "undefined") {
      window.prompt("Copy live results link", link);
    }
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    if (result === "unsupported") {
      alert("Browser notifications are not supported on this device. In-app notifications will still appear.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyLiveLink}><Share2 className="h-4 w-4" /> Partager résultats live</Button>
      <Button variant="outline" onClick={enableNotifications}><Bell className="h-4 w-4" /> Activer notifications</Button>
    </div>
  );
}
