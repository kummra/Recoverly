"use client";

import { useState } from "react";
import { AlertCircle, Check, Database, Download, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { deleteAllChatSessions, getDrinkRecords } from "@/lib/firestore";

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
  const [busy, setBusy] = useState<null | "export" | "chats">(null);
  const [confirmChats, setConfirmChats] = useState(false);
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

  const wipeChats = async () => {
    if (!user) return;
    setBusy("chats");
    setStatus(null);
    try {
      const n = await deleteAllChatSessions(user.uid);
      setConfirmChats(false);
      setStatus({ type: "success", text: `Deleted ${n} conversation${n === 1 ? "" : "s"}.` });
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

        {confirmChats ? (
          <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-950/10 p-3">
            <p className="text-sm text-slate-300">
              This permanently removes every AI conversation. Your records and goals stay.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                onClick={wipeChats}
                disabled={busy !== null}
              >
                {busy === "chats" ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmChats(false)} disabled={busy !== null}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => { setConfirmChats(true); setStatus(null); }}
            disabled={busy !== null}
          >
            <Trash2 className="h-4 w-4" />
            Delete all AI conversations
          </Button>
        )}

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
