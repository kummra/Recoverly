import type { Metadata } from "next";
import {
  Inter,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu
} from "next/font/google";

import { AppLockProvider } from "@/components/app-lock-provider";
import { AuthProvider } from "@/components/auth-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { SiteFooter } from "@/components/site-footer";
import { AppStructuredData } from "@/components/structured-data";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Inter has no Indic glyphs. Without these the app would fall back to whatever
// the device happens to have — inconsistent at best, tofu boxes at worst.
// next/font requires literal options (it statically analyses these calls), so
// each is spelled out rather than shared via a spread.
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "700"], display: "swap", variable: "--font-devanagari" });
const gurmukhi = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: ["400", "500", "700"], display: "swap", variable: "--font-gurmukhi" });
const gujarati = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: ["400", "500", "700"], display: "swap", variable: "--font-gujarati" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "500", "700"], display: "swap", variable: "--font-tamil" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "500", "700"], display: "swap", variable: "--font-telugu" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "500", "700"], display: "swap", variable: "--font-kannada" });
const malayalam = Noto_Sans_Malayalam({ subsets: ["malayalam"], weight: ["400", "500", "700"], display: "swap", variable: "--font-malayalam" });

const fontVars = [
  inter.variable,
  devanagari.variable,
  gurmukhi.variable,
  gujarati.variable,
  tamil.variable,
  telugu.variable,
  kannada.variable,
  malayalam.variable
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL("https://recoverly.co.in"),
  alternates: { canonical: "/" },
  // The brand name alone is shared with unrelated products (a shop-cart app, a
  // pain tracker), so the title says what this one is. Brand last, as the
  // template does on every other page. Kept under about 60 characters so a
  // search result does not cut it off.
  title: {
    default: "Recoverly: free, private app to cut down or quit alcohol",
    template: "%s · Recoverly"
  },
  description:
    "Free, private app to cut down or quit alcohol. Track drinks, ride out cravings, take the WHO AUDIT self-check, read sourced guides. 9 Indian languages.",
  keywords: [
    "alcohol recovery app",
    "quit drinking app",
    "reduce alcohol",
    "sobriety tracker",
    "alcohol helpline India",
    "AUDIT self-check",
    "Tele-MANAS",
    "de-addiction support",
    "Recoverly"
  ],
  applicationName: "Recoverly",
  openGraph: {
    title: "Recoverly: free, private app to cut down or quit alcohol",
    description:
      "Track your drinking privately, get through cravings, read sourced guides and find helplines. In English, Hindi, Marathi, Punjabi, Tamil, Telugu, Kannada, Malayalam and Gujarati.",
    url: "https://recoverly.co.in",
    siteName: "Recoverly",
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Recoverly: free, private app to cut down or quit alcohol",
    description:
      "Track your drinking privately, get through cravings, read sourced guides and find helplines. Free, in nine Indian languages."
  },
  robots: {
    index: true,
    follow: true
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Recoverly" },
  // The SVG is the master and crisp at any size; the .ico is for older browsers,
  // crawlers and anything that asks for /favicon.ico by default ("any" lets the
  // SVG win where both are understood); the PNG is for the app-install icon.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <body>
        <AppStructuredData />
        <ThemeProvider>
        <I18nProvider>
        <ServiceWorkerRegistrar />
        <AuthProvider>
          {/* The privacy lock: shows a PIN screen in place of the app when it is
              closed, and nothing at all for anyone who has not turned it on. */}
          <AppLockProvider>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
              <TopNav />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </AppLockProvider>
        </AuthProvider>
        </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
