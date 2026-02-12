"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, LayoutDashboard, BarChart3, Bot, Settings, Menu, X, LogOut, LogIn } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/records", label: "Records", icon: BarChart3 },
  { href: "/ai", label: "Our AI", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function TopNav() {
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="mb-6 rounded-2xl border border-border bg-slate-900/70 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
            <span className="text-sm font-bold text-emerald-400">R</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Recoverly</h1>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary navigation" className="hidden gap-1 text-sm text-slate-300 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all hover:bg-slate-800 hover:text-white",
                  pathname === item.href && "bg-slate-800 text-white shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-slate-400 lg:block">{user.email}</span>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => signOutUser()}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Log in
              </Link>
            </Button>
          )}

          {/* Mobile toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-slate-800",
                  pathname === item.href && "bg-slate-800 text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
