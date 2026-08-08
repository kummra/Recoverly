"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Wine } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { addDrinkRecord } from "@/lib/firestore";
import { DRINK_TYPES, drinkRecordSchema } from "@/lib/schemas";

/** Drink types are stored as stable English ids; only the label is translated. */
const TYPE_KEYS: Record<(typeof DRINK_TYPES)[number], string> = {
  beer: "log.typeBeer",
  wine: "log.typeWine",
  whiskey: "log.typeWhiskey",
  vodka: "log.typeVodka",
  other: "log.typeOther"
};
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  userId: string;
  onSaved?: () => void;
};

/** SVG countdown ring - 36px circle, 5-second animation */
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;

  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <svg className="-rotate-90" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="hsl(218 18% 24%)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="hsl(165 60% 46%)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">
        {seconds > 0 ? seconds : <Pause className="h-3 w-3" />}
      </span>
    </div>
  );
}

const drinkEmoji: Record<string, string> = {
  beer: "Be",
  wine: "Wi",
  whiskey: "Wh",
  vodka: "Vo",
  other: "Ot"
};

export function LogDrinkModal({ userId, onSaved }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [drinkType, setDrinkType] = useState<(typeof DRINK_TYPES)[number]>("beer");
  const [otherType, setOtherType] = useState("");
  const [mood, setMood] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  const canSubmit = useMemo(() => countdown === 0 && !saving, [countdown, saving]);

  const submit = async () => {
    setError("");

    const parsed = drinkRecordSchema.safeParse({
      quantity: Number(quantity),
      type: drinkType,
      otherType: drinkType === "other" && otherType.trim() ? otherType.trim() : undefined,
      mood: mood.trim() ? mood.trim() : undefined
    });

    if (!parsed.success) {
      setError(t("log.invalid"));
      return;
    }

    try {
      setSaving(true);
      await addDrinkRecord(userId, parsed.data);
      setOpen(false);
      setQuantity("");
      setMood("");
      setDrinkType("beer");
      setOtherType("");
      onSaved?.();
    } catch {
      setError(t("log.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-14 w-full gap-2 text-base font-semibold sm:w-auto sm:px-8">
          <Wine className="h-5 w-5" />
          {t("dashboard.logDrink")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("log.pauseTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("log.pauseBody")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="quantity">{t("log.quantity")}</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={5000}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("log.quantityPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("log.drinkType")}</Label>
            <Select value={drinkType} onValueChange={(value) => setDrinkType(value as (typeof DRINK_TYPES)[number])}>
              <SelectTrigger aria-label={t("log.drinkType")}>
                <SelectValue placeholder={t("log.selectType")} />
              </SelectTrigger>
              <SelectContent>
                {DRINK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-surface text-[10px] font-bold text-body">
                        {drinkEmoji[type] ?? type.slice(0, 2)}
                      </span>
                      <span className="capitalize">{t(TYPE_KEYS[type])}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {drinkType === "other" ? (
            <div className="space-y-2">
              <Label htmlFor="otherType">
                {t("log.whatDidYouHave")} <span className="text-xs text-subtle">{t("common.optional")}</span>
              </Label>
              <Input
                id="otherType"
                value={otherType}
                onChange={(e) => setOtherType(e.target.value)}
                maxLength={40}
                placeholder={t("log.otherPlaceholder")}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="mood">{t("log.mood")} <span className="text-xs text-subtle">{t("common.optional")}</span></Label>
            <Textarea
              id="mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              maxLength={120}
              placeholder={t("log.moodPlaceholder")}
              rows={2}
            />
          </div>
          {error ? (
            <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="flex-row items-center gap-3">
          <div className="mr-auto flex items-center gap-2">
            <CountdownRing seconds={countdown} total={5} />
            <span id="submit-status" className="text-sm text-muted-foreground">
              {countdown > 0 ? t("log.secondsRemaining", { n: countdown }) : t("log.readyToSubmit")}
            </span>
          </div>
          <Button onClick={submit} disabled={!canSubmit} aria-describedby="submit-status">
            {saving ? t("common.saving") : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
