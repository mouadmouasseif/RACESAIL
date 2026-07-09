import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";
import { FirebaseStatusBadge } from "@/components/firebase-status";
import "./globals.css";

export const metadata: Metadata = {
  title: "raceSail",
  description: "Simple sailing competition management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "raceSail",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4c81",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <FirebaseAnalytics />
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.png" alt="raceSail logo" className="h-10 w-10 rounded-md object-cover" />
                <span>
                  <span className="block text-lg font-bold tracking-tight text-slate-950">raceSail</span>
                  <span className="block text-xs font-medium text-muted-foreground">Simple sailing competition management</span>
                </span>
              </Link>
              <FirebaseStatusBadge />
            </div>
          </header>
          {children}
          <footer className="border-t bg-white/80 px-4 py-5 text-center text-sm text-muted-foreground">
            creat by Mouadmouasseif :{" "}
            <a className="font-semibold text-sky-700 hover:text-sky-900" href="https://mouadmouasseif.vercel.app" target="_blank" rel="noreferrer">
              mouadmouasseif.vercel.app
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
