import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { TimerProvider } from "@/components/timers/timer-store";
import { TimerOverlay } from "@/components/timers/timer-overlay";
import { ToastProvider } from "@/components/providers/toast-provider";
import { THEME_INIT_SCRIPT } from "@/lib/settings-store";
import "./globals.css";

// One typeface for the whole app — headings and body both use this, at
// different weights, instead of mixing a serif display font with a
// separate sans body font.
const rubik = Rubik({
  variable: "--font-primary",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מתכונים",
  description: "ספר מתכונים משותף עם סנכרון בענן ורשימת קניות.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${rubik.variable} h-full antialiased`}
    >
      <head>
        {/* Sets the theme class before first paint, so switching between
            light/dark/system in Settings never causes a flash of the wrong
            theme on the next load. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <SettingsProvider>
            <ToastProvider>
              <TimerProvider>
                {children}
                <TimerOverlay />
              </TimerProvider>
            </ToastProvider>
          </SettingsProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
