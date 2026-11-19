"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { loginPathFor } from "@/lib/safe-next";

type State = "idle" | "opening" | "waiting" | "no-plan" | "no-organisation" | "unavailable";

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The part of the members' gate that runs in the browser. If the person is signed in, it asks the server to open the
 * members' pages in this browser (`/api/org/session`, which checks their organisation's plan) and refreshes the page.
 * If they are not signed in it offers to sign in and come back. It tries once: if the page is still closed after
 * the refresh, it says why that might be, rather than looping.
 */
export function MemberAccess({ returnPath }: { returnPath: string }) {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const tried = useRef(false);

  useEffect(() => {
    if (loading || !user || tried.current) return;
    tried.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      setState("opening");
      try {
        const token = await getIdToken();
        if (!token) return setState("unavailable");
        const response = await fetch("/api/org/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) {
          setState("waiting");
          router.refresh();
          // Still here after a few seconds means the page did not open.
          timer = setTimeout(() => setState("unavailable"), 5000);
          return;
        }
        setState(response.status === 402 ? "no-plan" : response.status === 404 ? "no-organisation" : "unavailable");
      } catch {
        setState("unavailable");
      }
    })();
    return () => clearTimeout(timer);
  }, [getIdToken, loading, router, user]);

  if (loading || state === "opening" || state === "waiting") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Opening this page for your organisation…
      </p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <Link href={loginPathFor(returnPath)} className={buttonVariants()}>
          Sign in to open this page
        </Link>
        <p className="text-xs text-muted-foreground">Use the same sign-in you use for your organisation&rsquo;s account.</p>
      </div>
    );
  }

  if (state === "no-organisation") {
    return (
      <p role="alert" className="text-sm leading-relaxed text-body">
        This sign-in has no organisation yet.{" "}
        <Link href="/portal" className={LINK}>
          Set one up in the organisation portal
        </Link>
        .
      </p>
    );
  }
  if (state === "no-plan") {
    return (
      <p role="alert" className="text-sm leading-relaxed text-body">
        Your organisation does not have an active plan, so this page stays closed.{" "}
        <Link href="/portal" className={LINK}>
          Choose a plan in the portal
        </Link>
        .
      </p>
    );
  }
  if (state === "unavailable") {
    return (
      <p role="alert" className="text-sm leading-relaxed text-body">
        We could not open this page just now. Check that your browser allows cookies for this site, then reload. If it keeps happening, tell us at the address on the{" "}
        <Link href="/partners" className={LINK}>
          organisations page
        </Link>
        .
      </p>
    );
  }
  return null;
}
