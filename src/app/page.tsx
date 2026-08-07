"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartHandshake, Sparkles, ArrowRight, TrendingDown, Calendar, Quote } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { getDrinkRecords } from "@/lib/firestore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const allQuotes = [
  "Small steps repeated daily become your strongest identity.",
  "Recovery is not about perfection; it is about direction.",
  "Each honest check-in is proof that you care about your future.",
  "The bravest thing you can do today is notice and choose differently.",
  "Patterns change one intentional pause at a time.",
  "What you track, you transform.",
  "Your commitment is visible in every log you make."
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return allQuotes[dayOfYear % allQuotes.length];
}

export default function HomePage() {
  const { user } = useAuth();
  const [monthlyTotal, setMonthlyTotal] = useState<number | null>(null);
  const [recordCount, setRecordCount] = useState(0);

  const greeting = useMemo(getGreeting, []);
  const dailyQuote = useMemo(getDailyQuote, []);

  useEffect(() => {
    if (!user) {
      setMonthlyTotal(null);
      setRecordCount(0);
      return;
    }
    getDrinkRecords(user.uid).then((records) => {
      const now = new Date();
      const thisMonth = records.filter(
        (item) => item.createdAt.getMonth() === now.getMonth() && item.createdAt.getFullYear() === now.getFullYear()
      );
      setMonthlyTotal(thisMonth.reduce((sum, item) => sum + item.quantity, 0));
      setRecordCount(records.length);
    }).catch(() => {
      // Decorative summary only — leave it blank rather than surfacing an error here.
      setMonthlyTotal(null);
      setRecordCount(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <div className="stagger-children space-y-6">
      {/* Hero section */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-emerald-50 dark:to-emerald-950/30 p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-sky-500/5 blur-3xl" />

        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{greeting}</span>
          </div>
          <h2 className="mb-3 text-2xl font-bold leading-tight sm:text-3xl">
            You are building a{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-emerald-400 dark:to-sky-400 bg-clip-text text-transparent">
              healthier identity
            </span>
            .
          </h2>
          <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            This app helps you notice patterns, create gentle friction before choices, and celebrate every
            meaningful reduction in alcohol consumption.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Progress, not perfection
            </Badge>
            <Badge variant="outline">Calm decisions create long-term freedom</Badge>
            {user && (
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/dashboard">
                  Log a check-in
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Stats row for logged-in users */}
      {user && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-3.5 w-3.5" />
                This month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{monthlyTotal ?? 0} <span className="text-sm font-normal text-muted-foreground">ml</span></p>
            </CardContent>
          </Card>
          <Card className="border-sky-500/20 bg-sky-50 dark:bg-sky-950/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <TrendingDown className="h-3.5 w-3.5" />
                Total check-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{recordCount} <span className="text-sm font-normal text-muted-foreground">logged</span></p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Quick actions</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href="/records">View records</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/ai">Talk to AI</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily spotlight quote */}
      <Card className="relative overflow-hidden border-indigo-500/15 bg-gradient-to-r from-card to-indigo-50 dark:to-indigo-950/20">
        <div className="absolute right-4 top-4 text-indigo-500/10">
          <Quote className="h-16 w-16" />
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Today&apos;s focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="relative text-lg font-medium leading-relaxed text-foreground">
            &ldquo;{dailyQuote}&rdquo;
          </p>
          <p className="mt-3 text-xs text-subtle">A new thought surfaces each day to anchor your intention.</p>
        </CardContent>
      </Card>

      {/* Motivational cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {allQuotes.slice(0, 3).map((quote) => (
          <Card key={quote} className="group transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-surface-muted hover:shadow-lg hover:shadow-emerald-500/5">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-body group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                Recovery mindset
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">{quote}</CardContent>
          </Card>
        ))}
      </div>

      {/* CTA for non-logged-in */}
      {!user && (
        <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-50 dark:from-emerald-950/30 to-card">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Start your recovery journey</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free account to track consumption, view insights, and talk to our AI guide.
              </p>
            </div>
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
