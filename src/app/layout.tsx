import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://recoverly-app.vercel.app"),
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
        <ServiceWorkerRegistrar />
        <AuthProvider>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
            <TopNav />
            <main className="flex-1">{children}</main>
            <footer className="mt-12 border-t border-border py-6 text-center text-xs text-subtle">
              <p>Recoverly &mdash; Your compassionate recovery companion.</p>
              <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                <a href="/guide" className="underline underline-offset-2 hover:text-foreground">How it works</a>
                <span aria-hidden>&middot;</span>
                <a href="/faq" className="underline underline-offset-2 hover:text-foreground">FAQ</a>
                <span aria-hidden>&middot;</span>
                <a href="/support" className="font-medium text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-700 dark:hover:text-sky-300">Support &amp; helplines</a>
                <span aria-hidden>&middot;</span>
                <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy</a>
                <span aria-hidden>&middot;</span>
                <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</a>
              </nav>
              <p className="mt-2">Not a substitute for professional medical advice.</p>
            </footer>
          </div>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
