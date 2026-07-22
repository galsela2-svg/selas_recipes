import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { TimerProvider } from "@/components/timers/timer-store";
import { TimerOverlay } from "@/components/timers/timer-overlay";
import { ToastProvider } from "@/components/providers/toast-provider";
import { THEME_INIT_SCRIPT } from "@/lib/settings-store";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

// A warm editorial serif for recipe titles and hero headings — the app's
// one deliberate typographic "signature," so it reads as a crafted
// cookbook rather than a generic dashboard template.
const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-display",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700", "900"],
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
      className={`${heebo.variable} ${frankRuhlLibre.variable} h-full antialiased`}
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
