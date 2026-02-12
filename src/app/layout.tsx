import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Recoverly - Anti-Alcohol Recovery",
  description: "A compassionate, data-backed recovery companion."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
            <TopNav />
            <main className="flex-1">{children}</main>
            <footer className="mt-12 border-t border-border py-6 text-center text-xs text-slate-500">
              <p>Recoverly &mdash; Your compassionate recovery companion.</p>
              <p className="mt-1">
                Not a substitute for professional medical advice.{" "}
                <a href="/privacy" className="underline underline-offset-2 hover:text-slate-300">Privacy</a>
                {" "}&middot;{" "}
                <a href="/terms" className="underline underline-offset-2 hover:text-slate-300">Terms</a>
              </p>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
