"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Phone } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupportPerson } from "@/hooks/use-support-person";
import { MAX_PERSON_NAME, clearPerson, savePerson, validatePerson } from "@/lib/support-person";

type Note = { kind: "ok" | "error"; text: string } | null;

/**
 * Where the one person to call or text in a hard moment is saved and removed.
 * It lives on this device only (see `lib/support-person.ts`), which the
 * introduction says in plain words. A write the browser refuses is reported, not
 * swallowed: a number that quietly failed to save would fail at the worst moment.
 */
export function SupportPersonEditor({ userId }: { userId: string }) {
  const t = useT();
  const [person, setPerson] = useSupportPerson(userId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState<Note>(null);

  // Show what is saved. Done when it first arrives, not on every change, so
  // typing is never overwritten.
  useEffect(() => {
    if (person) {
      setName(person.name);
      setPhone(person.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person === null]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validatePerson({ name, phone });
    if (!result.ok) {
      setNote({ kind: "error", text: t(result.problem === "name" ? "person.errName" : "person.errPhone") });
      return;
    }
    if (savePerson(userId, result.person)) {
      setPerson(result.person);
      setName(result.person.name);
      setPhone(result.person.phone);
      setNote({ kind: "ok", text: t("person.saved") });
    } else {
      setNote({ kind: "error", text: t("person.errStore") });
    }
  };

  const remove = () => {
    clearPerson(userId);
    setPerson(null);
    setName("");
    setPhone("");
    setNote({ kind: "ok", text: t("person.removed") });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("person.title")}
        </CardTitle>
        <CardDescription>{t("person.intro", { sos: t("sos.trigger") })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-2">
            <Label htmlFor="person-name">{t("person.nameLabel")}</Label>
            <Input
              id="person-name"
              value={name}
              maxLength={MAX_PERSON_NAME}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="person-phone">{t("person.phoneLabel")}</Label>
            <Input
              id="person-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              maxLength={20}
              autoComplete="off"
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{t("common.save")}</Button>
            {person && (
              <Button type="button" variant="outline" onClick={remove}>
                {t("person.remove")}
              </Button>
            )}
          </div>

          {note && (
            <p
              role={note.kind === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
                note.kind === "ok"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              {note.kind === "ok" ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
              {note.text}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
