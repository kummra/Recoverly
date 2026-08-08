"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/components/i18n-provider";
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
  const t = useT();
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
      setError(t("account.deleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {t("account.deleteAccountTitle")}
        </CardTitle>
        <CardDescription>
          {t("account.deleteAccountDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); setConfirmText(""); setError(""); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/10 hover:text-red-800 dark:hover:text-red-200">
              <Trash2 className="h-4 w-4" />
              {t("account.deleteAccountCta")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("account.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("account.deleteBody", { word: CONFIRM_WORD })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="confirm-delete" className="sr-only">{t("account.deleteConfirmLabel", { word: CONFIRM_WORD })}</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
              />
              {error ? (
                <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
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
                className="bg-red-600 text-foreground hover:bg-red-700"
              >
                {deleting ? t("account.deleting") : t("account.deletePermanently")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
