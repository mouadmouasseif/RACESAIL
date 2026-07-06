import type { RaceNotification } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotificationPanel({ notifications }: { notifications: RaceNotification[] }) {
  const latest = notifications[0];

  return (
    <div className="grid gap-4">
      {latest ? (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-950">
          🔔 Race {latest.raceNumber} finished — results updated
        </div>
      ) : null}
      <Card>
        <CardHeader><CardTitle>Notification history</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {notifications.length ? notifications.map((notification) => (
            <div key={notification.id} className="rounded-md border bg-white px-3 py-2 text-sm">
              <p className="font-semibold">{notification.title}</p>
              <p className="text-muted-foreground">{notification.message}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">No race notifications yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
