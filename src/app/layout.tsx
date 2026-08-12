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
  metadataBase: new URL("https://recoverly-app.vercel.app"),
  alternates: { canonical: "/" },
  title: {
    default: "Recoverly — Anti-Alcohol Recovery",
    template: "%s · Recoverly"
  },
  description:
    "A compassionate, data-backed companion to help you reduce or quit alcohol — with private tracking, gentle insights, an AI support coach, and real crisis helplines.",
  keywords: [
    "alcohol recovery",
    "quit drinking",
    "reduce alcohol",
    "sobriety tracker",
    "de-addiction support",
    "Recoverly"
  ],
  applicationName: "Recoverly",
  openGraph: {
    title: "Recoverly — Anti-Alcohol Recovery",
    description:
      "Private alcohol-recovery tracking, gentle insights, and a non-judgmental AI support coach. You don't have to do this alone.",
    url: "https://recoverly-app.vercel.app",
    siteName: "Recoverly",
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Recoverly — Anti-Alcohol Recovery",
    description:
      "Private alcohol-recovery tracking, gentle insights, and a non-judgmental AI support coach."
  },
  robots: {
    index: true,
    follow: true
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Recoverly" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" }
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
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
            <TopNav />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </AuthProvider>
        </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
