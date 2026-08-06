"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, LayoutDashboard, BarChart3, Bot, Settings, Menu, X, LogOut, LogIn, LifeBuoy, ClipboardCheck } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/records", labelKey: "nav.records", icon: BarChart3 },
  { href: "/assessment", labelKey: "nav.assessment", icon: ClipboardCheck },
  { href: "/ai", labelKey: "nav.ai", icon: Bot },
  { href: "/settings", labelKey: "nav.settings", icon: Settings }
];

export function TopNav() {
  const t = useT();
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="mb-6 rounded-2xl border border-border bg-surface-muted px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">R</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Recoverly</h1>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary navigation" className="hidden gap-1 text-sm text-body md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all hover:bg-surface hover:text-foreground",
                  pathname === item.href && "bg-surface text-foreground shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground lg:block">{user.email}</span>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => signOutUser()}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">{t("nav.logout")}</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                {t("nav.login")}
              </Link>
            </Button>
          )}

          {/* Mobile toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <nav className="mt-3 flex flex-col gap-1 border-t border-border pt-3 md:hidden" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-surface",
                  pathname === item.href && "bg-surface text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}

          {/* Crisis support must always be one tap away on mobile, where the
              footer links are a long scroll below the fold. */}
          <Link
            href="/support"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "mt-1 flex items-center gap-2 rounded-xl border-t border-border px-3 pb-2.5 pt-3.5 text-sm text-sky-700 dark:text-sky-300 transition-all hover:bg-surface",
              pathname === "/support" && "bg-surface text-sky-800 dark:text-sky-200"
            )}
          >
            <LifeBuoy className="h-4 w-4" />
            {t("nav.support")}
          </Link>
        </nav>
      )}
    </header>
  );
}
