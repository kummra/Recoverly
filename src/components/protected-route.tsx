"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-800" />
        </div>
        <div className="h-3 w-48 animate-pulse rounded-lg bg-slate-800/60" />
        <div className="mt-2 h-36 animate-pulse rounded-2xl bg-slate-800/40" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-800/40" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-800/40" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-800/40" />
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
