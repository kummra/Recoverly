"use client";

import { useState } from "react";
import { AlertCircle, Check, Database, Download, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { deleteAllChatSessions, deleteAllDrinkRecords, getDrinkRecords } from "@/lib/firestore";

type Status = { type: "success" | "error"; text: string };

/** RFC-4180 escaping: wrap in quotes and double any embedded quote. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Export and bulk-delete controls. This is the lighter-weight counterpart to
 * "delete my account": users can take their data with them, or clear one kind
 * of data, without destroying their whole history.
 */
export function DataManagement() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<null | "export" | "records" | "chats">(null);
  const [confirm, setConfirm] = useState<null | "records" | "chats">(null);
  const [status, setStatus] = useState<Status | null>(null);

  const exportCsv = async () => {
    if (!user) return;
    setBusy("export");
    setStatus(null);
    try {
      const records = await getDrinkRecords(user.uid);
      if (records.length === 0) {
        setStatus({ type: "error", text: "You have no records to export yet." });
        return;
      }
      const header = "Date,Type,Quantity (ml),Mood\n";
      const rows = records.map((r) =>
        [csvCell(r.createdAt.toISOString()), csvCell(r.type), r.quantity, csvCell(r.mood ?? "")].join(",")
      );
      const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recoverly-records-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", text: `Exported ${records.length} record${records.length === 1 ? "" : "s"}.` });
    } catch {
      setStatus({ type: "error", text: "Export failed. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const wipe = async (kind: "records" | "chats") => {
    if (!user) return;
    setBusy(kind);
    setStatus(null);
    try {
      const n =
        kind === "records"
          ? await deleteAllDrinkRecords(user.uid)
          : await deleteAllChatSessions(user.uid);
      setConfirm(null);
      setStatus({
        type: "success",
        text:
          kind === "records"
            ? `Deleted ${n} record${n === 1 ? "" : "s"}.`
            : `Deleted ${n} conversation${n === 1 ? "" : "s"}.`
      });
    } catch {
      setStatus({ type: "error", text: "Could not delete. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-amber-400" />
          Your data
        </CardTitle>
        <CardDescription>Take a copy with you, or clear what you no longer need.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={exportCsv}
          disabled={busy !== null}
        >
          <Download className="h-4 w-4" />
          {busy === "export" ? "Preparing…" : "Export my records (CSV)"}
        </Button>

        {(["records", "chats"] as const).map((kind) => {
          const label = kind === "records" ? "Delete all drink records" : "Delete all AI conversations";
          const warning =
            kind === "records"
              ? "This permanently removes every drink record. Your account and goals stay."
              : "This permanently removes every AI conversation. Your records stay.";
          return confirm === kind ? (
            <div key={kind} className="space-y-2 rounded-xl border border-red-500/30 bg-red-950/10 p-3">
              <p className="text-sm text-slate-300">{warning}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                  onClick={() => wipe(kind)}
                  disabled={busy !== null}
                >
                  {busy === kind ? "Deleting…" : "Yes, delete"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={busy !== null}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              key={kind}
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => { setConfirm(kind); setStatus(null); }}
              disabled={busy !== null}
            >
              <Trash2 className="h-4 w-4" />
              {label}
            </Button>
          );
        })}

        {status && (
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
              status.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
            }`}
          >
            {status.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {status.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
