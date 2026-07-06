"use client";

import type { RaceNotification } from "@/types";

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) return "unsupported";
  return window.Notification.requestPermission();
}

export function showRaceFinishedNotification(notification: RaceNotification) {
  if (!canUseBrowserNotifications()) return;
  if (window.Notification.permission !== "granted") return;

  new window.Notification("raceSail", {
    body: notification.message,
    icon: "/icons/icon-192.png",
  });
}
