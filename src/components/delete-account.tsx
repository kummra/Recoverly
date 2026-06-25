"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_WORD = "DELETE";

export function DeleteAccount() {
  const { getIdToken, signOutUser } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const onDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("delete failed");
      await signOutUser();
      router.replace("/");
    } catch {
      setError("Could not delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-red-300">
          <AlertTriangle className="h-4 w-4" />
          Delete account
        </CardTitle>
        <CardDescription>
          Permanently remove your account and all of your data — drink records, goals, and
          AI conversations. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); setConfirmText(""); setError(""); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200">
              <Trash2 className="h-4 w-4" />
              Delete my account &amp; data
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your account and every record tied to it. There is
                no way to recover it. Type <span className="font-semibold text-red-300">{CONFIRM_WORD}</span> to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="confirm-delete" className="sr-only">Type {CONFIRM_WORD} to confirm</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
              />
              {error ? (
                <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onDelete}
                disabled={deleting || confirmText !== CONFIRM_WORD}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Permanently delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
