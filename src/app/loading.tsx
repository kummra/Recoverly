export default function GlobalLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-xl bg-slate-800" />
        <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-800" />
      </div>
      <div className="h-3 w-56 animate-pulse rounded-lg bg-slate-800/60" />
      <div className="mt-2 h-40 w-full animate-pulse rounded-2xl bg-slate-800/40" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-800/40" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-800/40" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-800/40" />
      </div>
      <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-800/40" />
    </div>
  );
}
